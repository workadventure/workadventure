import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  ChevronRight,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  HardDrive,
  RefreshCw,
  Server,
} from 'lucide-react';
import type { WorkspaceNode } from './types';

type FileSource = {
  id: string;
  label: string;
  kind: 'host' | 'docker';
  available: boolean;
  description?: string;
  rootPath: string;
  preferred?: boolean;
  hint?: string;
};

type FileEntry = {
  name: string;
  path: string;
  kind: 'directory' | 'file';
  size?: number;
  mtime?: number;
};

type FileListResponse = {
  sourceId: string;
  path: string;
  kind: 'directory' | 'file';
  entries: FileEntry[];
  error?: string;
};

type FilePreviewResponse = {
  sourceId: string;
  path: string;
  kind: 'directory' | 'file';
  previewable?: boolean;
  content?: string;
  size?: number;
  mtime?: number;
  truncated?: boolean;
  reason?: string;
  error?: string;
};

type SourcesResponse = {
  sources: FileSource[];
  dockerAvailable: boolean;
  dockerError?: string;
};

const DEFAULT_FILE_SERVICE_URL = 'http://127.0.0.1:4175';

function formatDate(value?: number): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatSize(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function pathSegments(value: string): string[] {
  return value.split('/').filter(Boolean);
}

function buildBreadcrumbs(value: string) {
  const segments = pathSegments(value);
  return [
    { label: 'Root', path: '/' },
    ...segments.map((segment, index) => ({
      label: segment,
      path: `/${segments.slice(0, index + 1).join('/')}`,
    })),
  ];
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

function SourceIcon({ source }: { source: FileSource }): ReactNode {
  if (source.kind === 'host') {
    return <HardDrive size={16} strokeWidth={2.1} />;
  }

  return <Server size={16} strokeWidth={2.1} />;
}

export function FileManagerPanel({ node }: { node: WorkspaceNode }): ReactNode {
  const serviceUrl = node.fileServiceUrl ?? DEFAULT_FILE_SERVICE_URL;
  const [sources, setSources] = useState<FileSource[]>([]);
  const [sourcesError, setSourcesError] = useState<string>();
  const [selectedSourceId, setSelectedSourceId] = useState<string>();
  const [currentPath, setCurrentPath] = useState('/');
  const [directoryData, setDirectoryData] = useState<FileListResponse>();
  const [directoryError, setDirectoryError] = useState<string>();
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<FileEntry>();
  const [preview, setPreview] = useState<FilePreviewResponse>();
  const [previewError, setPreviewError] = useState<string>();
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId),
    [selectedSourceId, sources],
  );

  const reloadSources = async (): Promise<void> => {
    try {
      setSourcesError(undefined);
      const payload = await fetchJson<SourcesResponse>(`${serviceUrl}/api/sources`);
      setSources(payload.sources);

      setSelectedSourceId((current) => {
        if (current && payload.sources.some((source) => source.id === current)) {
          return current;
        }

        const preferred =
          payload.sources.find((source) => source.preferred && source.available) ??
          payload.sources.find((source) => source.available) ??
          payload.sources[0];

        return preferred?.id;
      });
    } catch (error) {
      setSources([]);
      setSelectedSourceId(undefined);
      setSourcesError(error instanceof Error ? error.message : 'Failed to connect to workspace file service');
    }
  };

  useEffect(() => {
    void reloadSources();
  }, [serviceUrl]);

  useEffect(() => {
    setCurrentPath('/');
    setSelectedEntry(undefined);
    setPreview(undefined);
    setPreviewError(undefined);
  }, [selectedSourceId]);

  useEffect(() => {
    if (!selectedSourceId) {
      setDirectoryData(undefined);
      return;
    }

    let disposed = false;
    const run = async (): Promise<void> => {
      setIsDirectoryLoading(true);
      setDirectoryError(undefined);

      try {
        const payload = await fetchJson<FileListResponse>(
          `${serviceUrl}/api/list?source=${encodeURIComponent(selectedSourceId)}&path=${encodeURIComponent(currentPath)}`,
        );

        if (disposed) return;

        setDirectoryData(payload);
      } catch (error) {
        if (disposed) return;
        setDirectoryData(undefined);
        setDirectoryError(error instanceof Error ? error.message : 'Failed to load folder');
      } finally {
        if (!disposed) {
          setIsDirectoryLoading(false);
        }
      }
    };

    void run();

    return () => {
      disposed = true;
    };
  }, [currentPath, selectedSourceId, serviceUrl]);

  const openEntry = (entry: FileEntry): void => {
    if (entry.kind === 'directory') {
      setCurrentPath(entry.path);
      setSelectedEntry(undefined);
      setPreview(undefined);
      setPreviewError(undefined);
      return;
    }

    setSelectedEntry(entry);
  };

  useEffect(() => {
    if (!selectedSourceId || !selectedEntry || selectedEntry.kind !== 'file') {
      setPreview(undefined);
      setPreviewError(undefined);
      return;
    }

    let disposed = false;
    const run = async (): Promise<void> => {
      setIsPreviewLoading(true);
      setPreviewError(undefined);

      try {
        const payload = await fetchJson<FilePreviewResponse>(
          `${serviceUrl}/api/preview?source=${encodeURIComponent(selectedSourceId)}&path=${encodeURIComponent(selectedEntry.path)}`,
        );
        if (disposed) return;
        setPreview(payload);
      } catch (error) {
        if (disposed) return;
        setPreview(undefined);
        setPreviewError(error instanceof Error ? error.message : 'Failed to preview file');
      } finally {
        if (!disposed) {
          setIsPreviewLoading(false);
        }
      }
    };

    void run();

    return () => {
      disposed = true;
    };
  }, [selectedEntry, selectedSourceId, serviceUrl]);

  const breadcrumbs = buildBreadcrumbs(currentPath);
  const selectedSourceUnavailable = selectedSource && !selectedSource.available;

  return (
    <div className="file-manager">
      <header className="file-manager__toolbar">
        <div className="file-manager__toolbar-copy">
          <div className="file-manager__eyebrow">Unified File Manager</div>
          <div className="file-manager__headline">Finder</div>
          <div className="file-manager__subcopy">
            Browse host workspace files and auto-detected running Docker containers from one place.
          </div>
        </div>

        <button type="button" className="file-manager__refresh" onClick={() => void reloadSources()}>
          <RefreshCw size={14} strokeWidth={2.2} />
          <span>Refresh Sources</span>
        </button>
      </header>

      {sourcesError ? (
        <div className="file-manager__error">
          <AlertCircle size={16} strokeWidth={2.2} />
          <div>
            <strong>File service not reachable.</strong>
            <div>Start it with: <code>cd workspace-app && npm run files</code></div>
          </div>
        </div>
      ) : null}

      <div className="file-manager__body">
        <aside className="file-manager__sources">
          <div className="file-manager__pane-title">Sources</div>
          <div className="file-manager__source-list">
            {sources.map((source) => (
              <button
                key={source.id}
                type="button"
                className={`file-manager__source ${selectedSourceId === source.id ? 'is-active' : ''} ${
                  source.available ? '' : 'is-unavailable'
                }`}
                onClick={() => setSelectedSourceId(source.id)}
              >
                <span className="file-manager__source-icon">
                  <SourceIcon source={source} />
                </span>
                <span className="file-manager__source-copy">
                  <span className="file-manager__source-title">{source.label}</span>
                  <span className="file-manager__source-subtitle">{source.description ?? source.rootPath}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="file-manager__browser">
          <div className="file-manager__pane-title">Browser</div>

          <div className="file-manager__breadcrumbs">
            {breadcrumbs.map((crumb, index) => (
              <button key={crumb.path} type="button" onClick={() => setCurrentPath(crumb.path)}>
                {index > 0 ? <ChevronRight size={12} strokeWidth={2.2} /> : null}
                <span>{index === 0 ? selectedSource?.label ?? crumb.label : crumb.label}</span>
              </button>
            ))}
          </div>

          {selectedSourceUnavailable ? (
            <div className="file-manager__empty">
              <FolderOpen size={20} strokeWidth={2.1} />
              <div>{selectedSource?.hint ?? 'This source is not available yet.'}</div>
            </div>
          ) : directoryError ? (
            <div className="file-manager__empty">
              <AlertCircle size={20} strokeWidth={2.1} />
              <div>{directoryError}</div>
            </div>
          ) : isDirectoryLoading ? (
            <div className="file-manager__empty">Loading folder…</div>
          ) : (
            <div className="file-manager__table">
              <div className="file-manager__table-head">
                <span>Name</span>
                <span>Modified</span>
                <span>Size</span>
              </div>

              {currentPath !== '/' ? (
                <button
                  type="button"
                  className="file-manager__row"
                  onClick={() => {
                    const parts = pathSegments(currentPath);
                    const parent = parts.length ? `/${parts.slice(0, -1).join('/')}` || '/' : '/';
                    setCurrentPath(parent);
                    setSelectedEntry(undefined);
                    setPreview(undefined);
                    setPreviewError(undefined);
                  }}
                >
                  <span className="file-manager__row-name">
                    <Folder size={16} strokeWidth={2.1} />
                    <strong>..</strong>
                  </span>
                  <span>—</span>
                  <span>—</span>
                </button>
              ) : null}

              {directoryData?.entries.map((entry) => (
                <button
                  key={entry.path}
                  type="button"
                  className={`file-manager__row ${selectedEntry?.path === entry.path ? 'is-selected' : ''}`}
                  onClick={() => openEntry(entry)}
                >
                  <span className="file-manager__row-name">
                    {entry.kind === 'directory' ? (
                      <Folder size={16} strokeWidth={2.1} />
                    ) : (
                      <FileText size={16} strokeWidth={2.1} />
                    )}
                    <span>{entry.name}</span>
                  </span>
                  <span>{formatDate(entry.mtime)}</span>
                  <span>{entry.kind === 'directory' ? 'Folder' : formatSize(entry.size)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="file-manager__preview">
          <div className="file-manager__pane-title">Preview</div>

          {selectedEntry ? (
            <div className="file-manager__preview-card">
              <div className="file-manager__preview-meta">
                <div className="file-manager__preview-title">
                  {selectedEntry.kind === 'directory' ? (
                    <FolderOpen size={16} strokeWidth={2.1} />
                  ) : (
                    <FileCode2 size={16} strokeWidth={2.1} />
                  )}
                  <span>{selectedEntry.name}</span>
                </div>
                <div className="file-manager__preview-facts">
                  <span>{selectedEntry.kind === 'directory' ? 'Directory' : 'File'}</span>
                  <span>{formatSize(preview?.size ?? selectedEntry.size)}</span>
                  <span>{formatDate(preview?.mtime ?? selectedEntry.mtime)}</span>
                </div>
              </div>

              {isPreviewLoading ? (
                <div className="file-manager__empty">Loading preview…</div>
              ) : previewError ? (
                <div className="file-manager__empty">{previewError}</div>
              ) : preview?.previewable && preview.content ? (
                <>
                  <pre className="file-manager__preview-content">{preview.content}</pre>
                  {preview.truncated ? (
                    <div className="file-manager__preview-note">Preview truncated for this MVP.</div>
                  ) : null}
                </>
              ) : (
                <div className="file-manager__empty">
                  {preview?.reason ?? 'Select a file to preview its contents, or open a folder to browse deeper.'}
                </div>
              )}
            </div>
          ) : (
            <div className="file-manager__preview-card">
              <div className="file-manager__empty">
                <FolderOpen size={20} strokeWidth={2.1} />
                <div>
                  <strong>{selectedSource?.label ?? 'Choose a source'}</strong>
                  <div>Pick a file from the browser to preview it here.</div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
