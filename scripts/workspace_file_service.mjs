#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const HOST_ROOT = process.env.WORKSPACE_FILE_ROOT
  ? path.resolve(process.env.WORKSPACE_FILE_ROOT)
  : ROOT;
const PORT = Number(process.env.WORKSPACE_FILE_PORT ?? '4175');
const MAX_PREVIEW_BYTES = Number(process.env.WORKSPACE_FILE_PREVIEW_BYTES ?? '200000');
const TEXT_EXTENSIONS = new Set([
  '.c',
  '.cc',
  '.cpp',
  '.css',
  '.env',
  '.go',
  '.graphql',
  '.h',
  '.hpp',
  '.html',
  '.java',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.py',
  '.rb',
  '.rs',
  '.sh',
  '.sql',
  '.svg',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
  '.yaml',
  '.yml',
]);

function json(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data, null, 2));
}

function normalizeVirtualPath(inputPath) {
  const raw = typeof inputPath === 'string' && inputPath.length > 0 ? inputPath : '/';
  const normalized = path.posix.normalize(raw.startsWith('/') ? raw : `/${raw}`);
  return normalized === '.' ? '/' : normalized;
}

function hostAbsolutePath(virtualPath) {
  const normalized = normalizeVirtualPath(virtualPath);
  const resolved = path.resolve(HOST_ROOT, `.${normalized}`);
  if (resolved !== HOST_ROOT && !resolved.startsWith(`${HOST_ROOT}${path.sep}`)) {
    throw new Error('Path escapes host root');
  }
  return resolved;
}

function toFileType(entryType) {
  return entryType === 'd' ? 'directory' : 'file';
}

function sortEntries(entries) {
  return entries.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === 'directory' ? -1 : 1;
    }

    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}

function sourceLabelForContainer(container) {
  if (/ubuntu/i.test(container.image) || /ubuntu/i.test(container.name)) {
    return `Ubuntu · ${container.name}`;
  }

  return container.name;
}

async function listDockerContainers() {
  try {
    const { stdout } = await execFileAsync('docker', [
      'ps',
      '--format',
      '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}',
    ]);

    const containers = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [id, name, image, status] = line.split('\t');
        return { id, name, image, status };
      });

    return containers;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to query docker containers',
      containers: [],
    };
  }
}

async function getSources() {
  const dockerResult = await listDockerContainers();
  const containers = Array.isArray(dockerResult) ? dockerResult : dockerResult.containers;
  const dockerError = Array.isArray(dockerResult) ? undefined : dockerResult.error;
  const ubuntuContainers = containers.filter((container) => /ubuntu/i.test(container.image) || /ubuntu/i.test(container.name));
  const otherContainers = containers.filter((container) => !/ubuntu/i.test(container.image) && !/ubuntu/i.test(container.name));

  const sources = [
    {
      id: 'host:workspace',
      label: 'Workspace Root',
      kind: 'host',
      available: true,
      description: HOST_ROOT,
      rootPath: '/',
      preferred: ubuntuContainers.length === 0,
    },
    ...ubuntuContainers.map((container) => ({
      id: `docker:${container.name}`,
      label: sourceLabelForContainer(container),
      kind: 'docker',
      available: true,
      description: `${container.image} · ${container.status}`,
      rootPath: '/',
      preferred: true,
      containerName: container.name,
      image: container.image,
    })),
  ];

  if (ubuntuContainers.length === 0) {
    sources.push({
      id: 'docker:ubuntu-missing',
      label: 'Ubuntu Docker',
      kind: 'docker',
      available: false,
      description: 'No running Ubuntu container detected yet',
      rootPath: '/',
      hint: `Run a named container like: docker run --name e2e-fix-ubuntu --rm -it -v "${HOST_ROOT}:/workspace" ubuntu:22.04 bash`,
      preferred: false,
    });
  }

  sources.push(
    ...otherContainers.map((container) => ({
      id: `docker:${container.name}`,
      label: sourceLabelForContainer(container),
      kind: 'docker',
      available: true,
      description: `${container.image} · ${container.status}`,
      rootPath: '/',
      preferred: false,
      containerName: container.name,
      image: container.image,
    })),
  );

  return {
    sources,
    dockerAvailable: !dockerError,
    dockerError,
  };
}

async function listHostPath(virtualPath) {
  const normalized = normalizeVirtualPath(virtualPath);
  const absolute = hostAbsolutePath(normalized);
  const stats = await fs.stat(absolute);

  if (!stats.isDirectory()) {
    throw new Error('Requested host path is not a directory');
  }

  const dirents = await fs.readdir(absolute, { withFileTypes: true });
  const entries = await Promise.all(
    dirents.map(async (dirent) => {
      const entryAbsolute = path.join(absolute, dirent.name);
      const entryStats = await fs.stat(entryAbsolute);
      return {
        name: dirent.name,
        path: normalizeVirtualPath(path.posix.join(normalized, dirent.name)),
        kind: dirent.isDirectory() ? 'directory' : 'file',
        size: entryStats.size,
        mtime: entryStats.mtimeMs,
      };
    }),
  );

  return {
    path: normalized,
    kind: 'directory',
    entries: sortEntries(entries),
  };
}

async function listDockerPath(containerName, virtualPath) {
  const normalized = normalizeVirtualPath(virtualPath);
  const checkScript = [
    'target="$1"',
    'if [ -d "$target" ]; then',
    '  echo "__DIR__"',
    "  find \"$target\" -mindepth 1 -maxdepth 1 -printf '%P\\t%y\\t%s\\t%T@\\n'",
    'elif [ -f "$target" ]; then',
    '  echo "__FILE__"',
    'else',
    '  echo "__MISSING__"',
    'fi',
  ].join('\n');

  const { stdout } = await execFileAsync('docker', ['exec', containerName, 'sh', '-lc', checkScript, 'finder', normalized], {
    maxBuffer: 1024 * 1024,
  });

  const lines = stdout.split('\n').filter(Boolean);
  const marker = lines.shift();

  if (marker === '__MISSING__') {
    throw new Error('Requested docker path does not exist');
  }

  if (marker === '__FILE__') {
    return {
      path: normalized,
      kind: 'file',
      entries: [],
    };
  }

  const entries = lines.map((line) => {
    const [name, rawType, rawSize, rawMtime] = line.split('\t');
    return {
      name,
      path: normalizeVirtualPath(path.posix.join(normalized, name)),
      kind: toFileType(rawType),
      size: Number(rawSize || 0),
      mtime: Number(rawMtime || 0) * 1000,
    };
  });

  return {
    path: normalized,
    kind: 'directory',
    entries: sortEntries(entries),
  };
}

async function readHostPreview(virtualPath) {
  const normalized = normalizeVirtualPath(virtualPath);
  const absolute = hostAbsolutePath(normalized);
  const stats = await fs.stat(absolute);

  if (!stats.isFile()) {
    return {
      path: normalized,
      previewable: false,
      kind: 'directory',
      size: stats.size,
      mtime: stats.mtimeMs,
    };
  }

  const extension = path.extname(absolute);
  if (!TEXT_EXTENSIONS.has(extension) && path.basename(absolute) !== 'Dockerfile') {
    return {
      path: normalized,
      previewable: false,
      kind: 'file',
      size: stats.size,
      mtime: stats.mtimeMs,
      reason: 'Preview is limited to common text/code files in this MVP.',
    };
  }

  const buffer = await fs.readFile(absolute);
  const truncated = buffer.length > MAX_PREVIEW_BYTES;
  return {
    path: normalized,
    previewable: true,
    kind: 'file',
    size: stats.size,
    mtime: stats.mtimeMs,
    truncated,
    content: buffer.subarray(0, MAX_PREVIEW_BYTES).toString('utf8'),
  };
}

async function readDockerPreview(containerName, virtualPath) {
  const normalized = normalizeVirtualPath(virtualPath);
  const extension = path.extname(normalized);

  if (!TEXT_EXTENSIONS.has(extension) && path.posix.basename(normalized) !== 'Dockerfile') {
    return {
      path: normalized,
      previewable: false,
      kind: 'file',
      reason: 'Preview is limited to common text/code files in this MVP.',
    };
  }

  const sizeScript = 'if [ -f "$1" ]; then wc -c < "$1"; else echo 0; fi';
  const { stdout: sizeStdout } = await execFileAsync('docker', [
    'exec',
    containerName,
    'sh',
    '-lc',
    sizeScript,
    'finder',
    normalized,
  ]);
  const size = Number(sizeStdout.trim() || '0');

  const previewScript = 'if [ -f "$1" ]; then head -c "$2" -- "$1"; fi';
  const { stdout } = await execFileAsync(
    'docker',
    ['exec', containerName, 'sh', '-lc', previewScript, 'finder', normalized, String(MAX_PREVIEW_BYTES)],
    { maxBuffer: MAX_PREVIEW_BYTES * 2 },
  );

  return {
    path: normalized,
    previewable: true,
    kind: 'file',
    size,
    truncated: size > MAX_PREVIEW_BYTES,
    content: stdout,
  };
}

function parseSourceId(sourceId) {
  if (sourceId === 'host:workspace') {
    return { kind: 'host' };
  }

  if (sourceId.startsWith('docker:') && sourceId !== 'docker:ubuntu-missing') {
    return { kind: 'docker', containerName: sourceId.slice('docker:'.length) };
  }

  if (sourceId === 'docker:ubuntu-missing') {
    return { kind: 'docker-missing' };
  }

  throw new Error(`Unsupported source: ${sourceId}`);
}

async function handleSources(_req, res) {
  const payload = await getSources();
  json(res, 200, payload);
}

async function handleList(req, res, url) {
  const sourceId = url.searchParams.get('source');
  const virtualPath = url.searchParams.get('path') ?? '/';

  if (!sourceId) {
    json(res, 400, { error: 'Missing source query parameter' });
    return;
  }

  try {
    const source = parseSourceId(sourceId);
    const result =
      source.kind === 'host'
        ? await listHostPath(virtualPath)
        : source.kind === 'docker'
          ? await listDockerPath(source.containerName, virtualPath)
          : (() => {
              throw new Error('Ubuntu docker source is not running yet');
            })();

    json(res, 200, { sourceId, ...result });
  } catch (error) {
    json(res, 500, {
      error: error instanceof Error ? error.message : 'Failed to list files',
      sourceId,
      path: normalizeVirtualPath(virtualPath),
    });
  }
}

async function handlePreview(req, res, url) {
  const sourceId = url.searchParams.get('source');
  const virtualPath = url.searchParams.get('path');

  if (!sourceId || !virtualPath) {
    json(res, 400, { error: 'Missing source or path query parameter' });
    return;
  }

  try {
    const source = parseSourceId(sourceId);
    const preview =
      source.kind === 'host'
        ? await readHostPreview(virtualPath)
        : source.kind === 'docker'
          ? await readDockerPreview(source.containerName, virtualPath)
          : (() => {
              throw new Error('Ubuntu docker source is not running yet');
            })();

    json(res, 200, { sourceId, ...preview });
  } catch (error) {
    json(res, 500, {
      error: error instanceof Error ? error.message : 'Failed to preview file',
      sourceId,
      path: normalizeVirtualPath(virtualPath),
    });
  }
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    json(res, 400, { error: 'Missing request url' });
    return;
  }

  if (req.method === 'OPTIONS') {
    json(res, 200, { ok: true });
    return;
  }

  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      json(res, 200, { ok: true, port: PORT, hostRoot: HOST_ROOT });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/sources') {
      await handleSources(req, res);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/list') {
      await handleList(req, res, url);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/preview') {
      await handlePreview(req, res, url);
      return;
    }

    json(res, 404, { error: 'Not found' });
  } catch (error) {
    json(res, 500, {
      error: error instanceof Error ? error.message : 'Unexpected workspace file service error',
    });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`workspace file service listening on http://127.0.0.1:${PORT}`);
  console.log(`host root: ${HOST_ROOT}`);
});
