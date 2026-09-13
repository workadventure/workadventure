import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const script = fileURLToPath(new URL("./update-contributors.mts", import.meta.url));
const start = "<!-- contributors:start -->";
const end = "<!-- contributors:end -->";
const hiddenStart = "<!-- contributors:hidden:start";
const hiddenEnd = "contributors:hidden:end -->";
const prefix = "# WorkAdventure\n\nUnrelated text stays exactly as written.\n\n";
const suffix = "\n\n## Community resources\nKeep this section.\n";
const originalReadme = `${prefix}${start}\n${end}${suffix}`;
const user = (login, id, contributions = 1) => ({
    id,
    login,
    html_url: `https://github.com/${login}`,
    avatar_url: `https://avatars.githubusercontent.com/u/${id}?v=4`,
    contributions,
});

// Exercise the real CLI with local Git/GitHub responses and no network or credentials.
function fixture(t, data = {}) {
    const directory = mkdtempSync(join(tmpdir(), "wa-contributors-"));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const bin = join(directory, "bin");
    const configDirectory = join(directory, "contrib/tools/generate-contributors");
    mkdirSync(bin);
    mkdirSync(configDirectory, { recursive: true });
    writeFileSync(join(directory, "README.md"), data.readme ?? originalReadme);
    writeFileSync(join(configDirectory, "contributors-map.json"), JSON.stringify(data.config ?? {}));
    writeFileSync(join(directory, "fixture.json"), JSON.stringify(data));
    const command = `#!${process.execPath}
const fs = require('node:fs');
const data = JSON.parse(fs.readFileSync('fixture.json', 'utf8'));
const args = process.argv.slice(2);
const name = require('node:path').basename(process.argv[1]);
fs.appendFileSync('commands.jsonl', JSON.stringify({name, args}) + '\\n');
if (name === 'git') {
  if (args[0] === 'show') console.log(data.seed ?? '');
  else if (args[0] === 'rev-list') console.log('root');
  else if (args.includes('--reverse')) console.log(data.history ?? '');
  else console.log('2020-01-01T00:00:00Z');
} else if (args[0] === 'pr') {
  console.log((data.prs ?? []).join('\\n'));
} else if (data.errors?.[args[1]]) {
  console.error(data.errors[args[1]]);
  process.exit(1);
} else if (args[1].includes('/contributors?')) {
  if (!args.includes('--paginate') || !args.includes('--slurp')) process.exit(2);
  console.log(JSON.stringify(data.pages ?? [data.users ?? []]));
} else {
  const key = args[1].replace(/^users?\\//, '');
  const value = data.lookup?.[key] ?? (data.users ?? []).find(u => u.login === key);
  if (value) console.log(JSON.stringify(value));
  else { console.error('gh: Not Found (HTTP 404)'); process.exit(1); }
}
`;
    for (const name of ["git", "gh"]) {
        writeFileSync(join(bin, name), command);
        chmodSync(join(bin, name), 0o755);
    }
    const preload = `
import { readFileSync, appendFileSync } from 'node:fs';
const data = JSON.parse(readFileSync('fixture.json', 'utf8'));
const NativeDate = Date;
globalThis.Date = class extends NativeDate {
  constructor(...args) { super(...(args.length ? args : ['2026-09-13T00:00:00Z'])); }
};
// Bound stuck-response tests without changing production timeout values.
const nativeSetTimeout = setTimeout;
globalThis.setTimeout = (fn, delay, ...args) => nativeSetTimeout(fn, delay === 8000 ? 30 : delay, ...args);
globalThis.fetch = async (url) => {
  const login = new URL(url).pathname.slice(1, -4);
  appendFileSync('probes.jsonl', JSON.stringify(login) + '\\n');
  const mode = data.avatars?.[login];
  if (mode === 'headers-stalled') return new Promise(() => {});
  if (mode === 'body-stalled') return new Response(new ReadableStream({ pull() { return new Promise(() => {}); } }));
  if (mode === 'oversized') return new Response(new Uint8Array(), { headers: { 'content-length': '262145' } });
  if (mode === 'stream-oversized') return new Response(new Uint8Array(262145));
  if (mode === 'http-error') return new Response(null, { status: 503 });
  if (mode === 'unsupported') return new Response('not an image');
  if (mode === 'jpeg') return new Response(Buffer.from([255,216,255,192,0,11,8,0,40,0,40,1,1,17,0]));
  const png = Buffer.alloc(24);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(png);
  png.writeUInt32BE(mode === 'default' ? 420 : 40, 16);
  png.writeUInt32BE(mode === 'default' ? 420 : 40, 20);
  return new Response(png);
};
`;
    writeFileSync(join(directory, "preload.mjs"), preload);
    return {
        run() {
            const result = spawnSync(process.execPath, ["--import", join(directory, "preload.mjs"), script], {
                cwd: directory,
                env: { PATH: `${bin}:${process.env.PATH}` },
                encoding: "utf8",
                timeout: 10_000,
            });
            assert.ifError(result.error);
            return result;
        },
        readme: () => readFileSync(join(directory, "README.md"), "utf8"),
        probes: () => readFileSync(join(directory, "probes.jsonl"), "utf8").trim().split("\n").map(JSON.parse),
    };
}

test("uses the OpenClaw composite ranking, paginates, sizes avatars and retains API bot entries", (t) => {
    const early = user("early", 1, 5);
    const recent = user("recent", 2, 5);
    const doc = user("docs-only", 3, 1);
    const pr = user("pr-author", 4, 1);
    const bot = user("dependabot[bot]", 5, 100);
    const f = fixture(t, {
        pages: [
            [early, recent, doc],
            [pr, bot],
        ],
        history: [
            "Early\x1fearly@users.noreply.github.com\x1f2020-01-01T00:00:00Z",
            "50\t50\tsrc/a.ts",
            "Docs\x1fdocs-only@users.noreply.github.com\x1f2021-01-01T00:00:00Z",
            "1000000\t0\tdocs/generated.md",
            "Recent\x1f12+recent@users.noreply.github.com\x1f2026-09-13T00:00:00Z",
            "100\t0\tsrc/b.ts",
        ].join("\n"),
        prs: ["pr-author", "pr-author", "pr-author"],
    });
    const result = f.run();
    assert.equal(result.status, 0, result.stderr);
    const html = f.readme();
    const logins = [...html.matchAll(/<a href="https:\/\/github.com\/([^"]+)">/g)].map((m) => m[1]);
    assert.deepEqual(logins, ["dependabot[bot]", "pr-author", "early", "recent", "docs-only"]);
    assert.equal((html.match(/width="48" height="48"/g) ?? []).length, 5);
    assert.ok(html.startsWith(prefix));
    assert.ok(html.endsWith(suffix));
    assert.equal(f.run().status, 0);
    assert.equal(f.readme(), html, "regeneration must not add blank lines or unrelated changes");
});

test("resolves mapped authors and ensured users, escaping display names", (t) => {
    const octocat = user("octocat", 10, 1);
    const ensured = user("ensured", 11);
    const f = fixture(t, {
        users: [octocat],
        lookup: { ensured },
        config: {
            nameToLogin: { "The Author": "octocat" },
            emailToLogin: { "another@example.com": "octocat" },
            ensureLogins: ["ensured"],
            displayName: { octocat: 'A < B & "C"' },
        },
        history: [
            "The Author\x1funknown@example.com\x1f2020-01-01T00:00:00Z",
            "100\t0\tsrc/a.ts",
            "Another\x1fanother@example.com\x1f2021-01-01T00:00:00Z",
            "100\t0\tsrc/b.ts",
        ].join("\n"),
    });
    const result = f.run();
    assert.equal(result.status, 0, result.stderr);
    assert.match(f.readme(), /alt="A &lt; B &amp; &quot;C&quot;"/);
    assert.equal((f.readme().match(/href="https:\/\/github.com\/octocat"/g) ?? []).length, 1);
    assert.match(f.readme(), /href="https:\/\/github.com\/ensured"/);
});

test("keeps historical credit through renamed and deleted accounts without crediting a reused login", (t) => {
    const f = fixture(t, {
        users: [user("old-login", 22)],
        config: { seedCommit: "history" },
        lookup: { 21: user("new-login", 21) },
        seed: `${start}\n<a href="https://github.com/old-login"><img src="https://avatars.githubusercontent.com/u/21?v=4" alt="Original"></a>\n<img src="https://avatars.githubusercontent.com/u/23?v=4" alt="Deleted">\n${end}`,
    });
    const result = f.run();
    assert.equal(result.status, 0, result.stderr);
    assert.match(f.readme(), /href="https:\/\/github.com\/new-login"><img[^>]+alt="Original"/);
    assert.match(f.readme(), /<img[^>]+\/u\/23[^>]+alt="Deleted">/);
    assert.doesNotMatch(f.readme(), /href="https:\/\/github.com\/old-login"><img[^>]+alt="Original"/);
});

test("caches default avatars without hiding failed probes or changing unrelated README text", (t) => {
    const names = [
        "hidden",
        "cached",
        "jpeg",
        "http-error",
        "unsupported",
        "oversized",
        "stream-oversized",
        "headers-stalled",
        "body-stalled",
    ];
    const f = fixture(t, {
        users: names.map((name, index) => user(name, index + 1)),
        readme: `${prefix}${start}\n${end}\n${hiddenStart}\nnotice: cached default avatars\ncached\n${hiddenEnd}${suffix}`,
        avatars: Object.fromEntries(names.map((name) => [name, name === "hidden" ? "default" : name])),
    });
    const result = f.run();
    assert.equal(result.status, 0, result.stderr);
    const html = f.readme();
    assert.doesNotMatch(html, /href="https:\/\/github.com\/(?:hidden|cached)"/);
    for (const name of names.slice(2)) assert.ok(html.includes(`href="https://github.com/${name}"`));
    assert.ok(!f.probes().includes("cached"));
    assert.equal(f.probes().filter((name) => name === "hidden").length, 1);
    assert.equal(f.run().status, 0);
    assert.equal(f.probes().filter((name) => name === "hidden").length, 1);
    assert.equal(f.readme(), html);
    assert.ok(html.startsWith(prefix));
    assert.ok(html.endsWith(suffix));
});

test("does not rewrite README when GitHub lookups fail instead of silently losing credit", (t) => {
    const f = fixture(t, {
        config: { ensureLogins: ["unavailable"] },
        errors: { "users/unavailable": "gh: API rate limit exceeded (HTTP 403)" },
    });
    assert.notEqual(f.run().status, 0);
    assert.equal(f.readme(), originalReadme);
});

test("requires explicit contributor markers", (t) => {
    const readme = '# Project\n<p align="left">Unrelated images</p>\n';
    const f = fixture(t, { readme });
    const result = f.run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /missing contributors block/);
    assert.equal(f.readme(), readme);
});
