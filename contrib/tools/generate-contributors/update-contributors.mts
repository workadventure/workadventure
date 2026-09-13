/*
 * Adapted from OpenClaw scripts/update-clawtributors.ts at 65c8b06f2e42f4788d45da3b5573a761ddaf58fd
 * https://github.com/openclaw/openclaw/blob/65c8b06f2e42f4788d45da3b5573a761ddaf58fd/scripts/update-clawtributors.ts
 *
 * MIT License
 *
 * Copyright (c) 2026 OpenClaw Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
type MapConfig = {
    ensureLogins?: string[];
    displayName?: Record<string, string>;
    nameToLogin?: Record<string, string>;
    emailToLogin?: Record<string, string>;
    seedCommit?: string;
};

type ApiContributor = {
    id?: number;
    login?: string;
    html_url?: string;
    avatar_url?: string;
    name?: string;
    email?: string;
    contributions?: number;
};

type User = {
    id?: number;
    login: string;
    html_url: string;
    avatar_url: string;
};

type Entry = {
    key: string;
    login?: string;
    display: string;
    html_url: string | null;
    avatar_url: string;
    lines: number;
    commits: number;
    prs: number;
    score: number;
    firstCommitDate: string;
};

const REPO = "workadventure/workadventure";
const PER_LINE = 10;
const AVATAR_PROBE_SIZE = 40;
const AVATAR_PROBE_MAX_BYTES = 256 * 1024;
const AVATAR_PROBE_TIMEOUT_MS = 8000;
const AVATAR_SIZE = 48;
// The 5,000-PR history query can take about a minute; preserve healthy pagination
// headroom while bounding a stalled GitHub CLI process.
const GH_COMMAND_TIMEOUT_MS = 120_000;
const CONTRIBUTORS_START = "<!-- contributors:start -->";
const CONTRIBUTORS_END = "<!-- contributors:end -->";
const CONTRIBUTORS_HIDDEN_START = "<!-- contributors:hidden:start";
const CONTRIBUTORS_HIDDEN_END = "contributors:hidden:end -->";

const mapPath = resolve("contrib/tools/generate-contributors/contributors-map.json");
const mapConfig: MapConfig = JSON.parse(readFileSync(mapPath, "utf8"));

const displayName = normalizeMap(mapConfig.displayName ?? {});
const nameToLogin = normalizeMap(mapConfig.nameToLogin ?? {});
const emailToLogin = normalizeMap(mapConfig.emailToLogin ?? {});
const ensureLogins = (mapConfig.ensureLogins ?? []).map((login) => login.toLowerCase());

const readmePath = resolve("README.md");
const seedCommit = mapConfig.seedCommit ?? null;
const seedEntries = seedCommit ? parseReadmeEntries(runGit(["show", `${seedCommit}:README.md`])) : [];
const currentReadme = readFileSync(readmePath, "utf8");
const hiddenReadmeLogins = new Set(parseHiddenReadmeLogins(currentReadme));
const raw = runGh(["api", `repos/${REPO}/contributors?per_page=100&anon=1`, "--paginate", "--slurp"]);
const contributors: ApiContributor[] = JSON.parse(raw).flat();
const apiByLogin = new Map<string, User>();
const usersByAccountId = new Map<number, User | null>();
const contributionsByLogin = new Map<string, number>();
const defaultAvatarByLogin = new Map<string, Promise<boolean>>();

for (const item of contributors) {
    if (!item?.login || !item?.html_url || !item?.avatar_url) {
        continue;
    }
    if (typeof item.contributions === "number") {
        contributionsByLogin.set(item.login.toLowerCase(), item.contributions);
    }
    const user: User = {
        id: item.id,
        login: item.login,
        html_url: item.html_url,
        avatar_url: normalizeAvatar(item.avatar_url),
    };
    apiByLogin.set(item.login.toLowerCase(), user);
    if (user.id !== undefined) {
        usersByAccountId.set(user.id, user);
    }
}

for (const login of ensureLogins) {
    if (!apiByLogin.has(login)) {
        const user = fetchUser(login);
        if (user) {
            apiByLogin.set(user.login.toLowerCase(), user);
        }
    }
}

const linesByLogin = new Map<string, number>();
const firstCommitByLogin = new Map<string, string>();

// %x1f = unit separator to avoid collisions with author names containing "|"
const log = runGit(["log", "--reverse", "--format=%aN%x1f%aE%x1f%aI", "--numstat"]);

let currentName: string | null = null;
let currentEmail: string | null = null;

for (const line of log.split("\n")) {
    if (!line.trim()) {
        continue;
    }

    if (line.includes("\x1f")) {
        const [name, email, date] = line.split("\x1f", 3);
        currentName = name?.trim() ?? null;
        currentEmail = email?.trim().toLowerCase() ?? null;

        // Track first commit date per login (log is --reverse so first seen = earliest)
        if (currentName && date) {
            const login = resolveLogin(currentName, currentEmail, apiByLogin, nameToLogin, emailToLogin);
            if (login) {
                const key = login.toLowerCase();
                if (!firstCommitByLogin.has(key)) {
                    firstCommitByLogin.set(key, date.slice(0, 10));
                }
            }
        }
        continue;
    }

    if (!currentName) {
        continue;
    }

    const parts = line.split("\t");
    if (parts.length < 3) {
        continue;
    }

    // Skip docs paths so bulk-generated i18n scaffolds don't inflate rankings
    const filePath = expectDefined(parts[2], "git numstat file path");
    if (filePath.startsWith("docs/")) {
        continue;
    }

    const adds = parseCount(expectDefined(parts[0], "git numstat additions"));
    const dels = parseCount(expectDefined(parts[1], "git numstat deletions"));
    const total = adds + dels;
    if (!total) {
        continue;
    }

    const login = resolveLogin(currentName, currentEmail, apiByLogin, nameToLogin, emailToLogin);
    if (!login) {
        continue;
    }

    const key = login.toLowerCase();
    linesByLogin.set(key, (linesByLogin.get(key) ?? 0) + total);
}

for (const login of ensureLogins) {
    if (!linesByLogin.has(login)) {
        linesByLogin.set(login, 0);
    }
}

const prsByLogin = new Map<string, number>();
const prRaw = runGh([
    "pr",
    "list",
    "-R",
    REPO,
    "--state",
    "merged",
    "--limit",
    "5000",
    "--json",
    "author",
    "--jq",
    ".[].author.login",
]);
for (const login of prRaw.split("\n")) {
    const trimmed = login.trim().toLowerCase();
    if (!trimmed) {
        continue;
    }
    prsByLogin.set(trimmed, (prsByLogin.get(trimmed) ?? 0) + 1);
}

// Repo epoch for tenure calculation (root commit date)
const rootCommit = runGit(["rev-list", "--max-parents=0", "HEAD"]).split("\n")[0];
const repoEpochStr = runGit(["log", "--format=%aI", "-1", expectDefined(rootCommit, "repository root commit")]);
const repoEpoch = new Date(repoEpochStr.slice(0, 10)).getTime();
const nowDate = new Date().toISOString().slice(0, 10);
const now = new Date(nowDate).getTime();
const repoAgeDays = Math.max(1, (now - repoEpoch) / 86_400_000);

// Composite score:
//   base  = commits*2 + merged_PRs*10 + sqrt(code_LOC)
//   tenure = 1.0 + (days_since_first_commit / repo_age)^2 * 0.5
//   score  = base * tenure
// Squared curve: only true early contributors get meaningful boost.
// Day-1 = 1.5x, halfway through repo life = 1.125x, recent = ~1.0x.
function computeScore(loc: number, commits: number, prs: number, firstDate: string): number {
    const base = commits * 2 + prs * 10 + Math.sqrt(loc);
    const daysIn = firstDate ? Math.max(0, (now - new Date(firstDate.slice(0, 10)).getTime()) / 86_400_000) : 0;
    const tenureRatio = Math.min(1, daysIn / repoAgeDays);
    const tenure = 1 + tenureRatio * tenureRatio * 0.5;
    return base * tenure;
}

const entriesByKey = new Map<string, Entry>();

for (const seed of seedEntries) {
    const login =
        (seed.html_url ? loginFromUrl(seed.html_url) : null) ??
        resolveLogin(seed.display, null, apiByLogin, nameToLogin, emailToLogin);
    const accountId = accountIdFromAvatarUrl(seed.avatar_url);
    if (!login && !accountId) {
        continue;
    }
    const loginKey = login?.toLowerCase();
    const userByLogin = loginKey ? apiByLogin.get(loginKey) : undefined;
    // Avatar account IDs survive renames and cannot be claimed by a handle squatter.
    const user = accountId
        ? userByLogin?.id === accountId
            ? userByLogin
            : fetchUserByAccountId(accountId)
        : (userByLogin ?? (login ? fetchUser(login) : null));
    if (!user) {
        const key = accountId ? `github-id:${accountId}` : expectDefined(loginKey, "seed login key");
        entriesByKey.set(key, {
            key,
            display: seed.display,
            html_url: null,
            avatar_url: normalizeAvatar(seed.avatar_url),
            lines: 0,
            commits: 0,
            prs: 0,
            score: 0,
            firstCommitDate: loginKey ? (firstCommitByLogin.get(loginKey) ?? "") : "",
        });
        continue;
    }
    const key = user.login.toLowerCase();
    apiByLogin.set(key, user);
    const existing = entriesByKey.get(key);
    if (!existing) {
        const fd = firstCommitByLogin.get(key) ?? "";
        entriesByKey.set(key, {
            key,
            login: user.login,
            display: seed.display,
            html_url: user.html_url,
            avatar_url: user.avatar_url,
            lines: 0,
            commits: 0,
            prs: 0,
            score: 0,
            firstCommitDate: fd,
        });
    } else {
        existing.display = existing.display || seed.display;
        existing.login = user.login;
        existing.html_url = user.html_url;
        existing.avatar_url = user.avatar_url;
    }
}

for (const item of contributors) {
    const baseName = item.name?.trim() || item.email?.trim() || item.login?.trim();
    if (!baseName) {
        continue;
    }

    const resolvedLogin = item.login
        ? item.login
        : resolveLogin(baseName, item.email ?? null, apiByLogin, nameToLogin, emailToLogin);

    if (!resolvedLogin) {
        continue;
    }

    const key = resolvedLogin.toLowerCase();
    const user = apiByLogin.get(key) ?? fetchUser(resolvedLogin);
    if (!user) {
        continue;
    }
    apiByLogin.set(key, user);

    const existing = entriesByKey.get(key);
    if (!existing) {
        const loc = linesByLogin.get(key) ?? 0;
        const commits = contributionsByLogin.get(key) ?? 0;
        const prs = prsByLogin.get(key) ?? 0;
        const fd = firstCommitByLogin.get(key) ?? "";
        entriesByKey.set(key, {
            key,
            login: user.login,
            display: pickDisplay(baseName, user.login),
            html_url: user.html_url,
            avatar_url: normalizeAvatar(user.avatar_url),
            lines: loc > 0 ? loc : commits,
            commits,
            prs,
            score: computeScore(loc, commits, prs, fd),
            firstCommitDate: fd,
        });
    } else {
        existing.login = user.login;
        existing.display = pickDisplay(baseName, user.login, existing.display);
        existing.html_url = user.html_url;
        existing.avatar_url = normalizeAvatar(user.avatar_url);
        const loc = linesByLogin.get(key) ?? 0;
        const commits = contributionsByLogin.get(key) ?? 0;
        const prs = prsByLogin.get(key) ?? 0;
        const fd = firstCommitByLogin.get(key) ?? existing.firstCommitDate;
        existing.lines = Math.max(existing.lines, loc > 0 ? loc : commits);
        existing.commits = Math.max(existing.commits, commits);
        existing.prs = Math.max(existing.prs, prs);
        existing.firstCommitDate = fd || existing.firstCommitDate;
        existing.score = Math.max(existing.score, computeScore(loc, commits, prs, fd));
    }
}

// Contributor aggregates can lag behind a merge. PR authors and docs-only
// commit authors remain candidates even when the aggregate or code LOC is empty.
for (const login of new Set([...linesByLogin.keys(), ...firstCommitByLogin.keys(), ...prsByLogin.keys()])) {
    if (entriesByKey.has(login)) {
        continue;
    }
    let user = apiByLogin.get(login);
    if (!user) {
        user = fetchUser(login) || undefined;
    }
    if (user) {
        const loc = linesByLogin.get(login) ?? 0;
        const commits = contributionsByLogin.get(login) ?? 0;
        const prs = prsByLogin.get(login) ?? 0;
        const fd = firstCommitByLogin.get(login) ?? "";
        entriesByKey.set(login, {
            key: login,
            login: user.login,
            display: displayName[user.login.toLowerCase()] ?? user.login,
            html_url: user.html_url,
            avatar_url: normalizeAvatar(user.avatar_url),
            lines: loc > 0 ? loc : commits,
            commits,
            prs,
            score: computeScore(loc, commits, prs, fd),
            firstCommitDate: fd,
        });
    }
}

const entries = Array.from(entriesByKey.values());
const visibleEntries = await filterVisibleEntries(entries, hiddenReadmeLogins);

visibleEntries.sort((a, b) => {
    if (b.score !== a.score) {
        return b.score - a.score;
    }
    return a.display.localeCompare(b.display);
});

const markdownLines: string[] = [];
for (let i = 0; i < visibleEntries.length; i += PER_LINE) {
    const chunk = visibleEntries.slice(i, i + PER_LINE);
    const parts = chunk.map((entry) => {
        // Fixed 48px tiles: GitHub's avatar resizer sometimes ignores `s=48`
        // (default identicons come back 420px) and never upscales tiny source
        // avatars, so markdown images render off-grid without explicit sizing.
        const alt = escapeHtmlAttribute(entry.display);
        const image = `<img src="${entry.avatar_url}" width="48" height="48" alt="${alt}">`;
        return entry.html_url ? `<a href="${entry.html_url}">${image}</a>` : image;
    });
    markdownLines.push(parts.join(" "));
}

const block = `${CONTRIBUTORS_START}\n${markdownLines.join("\n")}\n${CONTRIBUTORS_END}`;
const range = findContributorsRange(currentReadme);
if (!range) {
    throw new Error("README.md missing contributors block");
}
const withVisible = `${currentReadme.slice(0, range.start)}${block}${currentReadme.slice(range.end)}`;
const hiddenBlock = buildHiddenReadmeBlock(entries, visibleEntries).trimEnd();
const hiddenRange = findHiddenReadmeRange(withVisible);
const blockEnd = range.start + block.length;
const next = hiddenRange
    ? `${withVisible.slice(0, hiddenRange.start)}${hiddenBlock}${withVisible.slice(hiddenRange.end)}`
    : `${withVisible.slice(0, blockEnd)}\n${hiddenBlock}${withVisible.slice(blockEnd)}`;
writeFileSync(readmePath, next);

console.log(
    `Updated README contributors: ${visibleEntries.length} visible (${entries.length - visibleEntries.length} default-avatar entries hidden)`,
);
function runGit(args: string[]): string {
    return execFileSync("git", args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 1024 * 1024 * 200,
    }).trim();
}

function runGh(args: string[]): string {
    return execFileSync("gh", args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 1024 * 1024 * 200,
        timeout: GH_COMMAND_TIMEOUT_MS,
        killSignal: "SIGKILL",
    }).trim();
}

function normalizeMap(map: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = Object.create(null);
    for (const [key, value] of Object.entries(map)) {
        out[normalizeName(key)] = value;
    }
    return out;
}

function normalizeName(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseCount(value: string): number {
    return /^\d+$/.test(value) ? Number(value) : 0;
}

function isValidLogin(login: string): boolean {
    if (!/^[A-Za-z0-9-]{1,39}$/.test(login)) {
        return false;
    }
    if (login.startsWith("-") || login.endsWith("-")) {
        return false;
    }
    if (login.includes("--")) {
        return false;
    }
    return true;
}

function normalizeLogin(login: string | null): string | null {
    if (!login) {
        return null;
    }
    const trimmed = login.trim();
    return isValidLogin(trimmed) ? trimmed : null;
}

function normalizeAvatar(url: string): string {
    if (!/^https?:/i.test(url)) {
        return url;
    }
    try {
        const parsed = new URL(url);
        parsed.searchParams.delete("s");
        parsed.searchParams.delete("size");
        parsed.searchParams.set("s", String(AVATAR_SIZE));
        return parsed.toString();
    } catch {
        return url;
    }
}

function accountIdFromAvatarUrl(url: string): number | null {
    try {
        const parsed = new URL(url);
        if (parsed.hostname !== "avatars.githubusercontent.com") {
            return null;
        }
        const match = /^\/u\/(\d+)\/?$/u.exec(parsed.pathname);
        const accountId = match?.[1] ? Number(match[1]) : Number.NaN;
        return Number.isSafeInteger(accountId) && accountId > 0 ? accountId : null;
    } catch {
        return null;
    }
}

function parseUser(responseText: string): User | null {
    const parsed = JSON.parse(responseText);
    if (!parsed?.login || !parsed?.html_url || !parsed?.avatar_url) {
        return null;
    }
    return {
        id: typeof parsed.id === "number" ? parsed.id : undefined,
        login: parsed.login,
        html_url: parsed.html_url,
        avatar_url: normalizeAvatar(parsed.avatar_url),
    };
}

function fetchUser(login: string): User | null {
    const normalized = normalizeLogin(login);
    if (!normalized) {
        return null;
    }
    try {
        return parseUser(runGh(["api", `users/${normalized}`]));
    } catch (error) {
        if (isGitHubMissing(error)) {
            return null;
        }
        throw error;
    }
}

function fetchUserByAccountId(accountId: number): User | null {
    if (usersByAccountId.has(accountId)) {
        return usersByAccountId.get(accountId) ?? null;
    }
    try {
        const user = parseUser(runGh(["api", `user/${accountId}`]));
        const matched = user?.id === accountId ? user : null;
        usersByAccountId.set(accountId, matched);
        return matched;
    } catch (error) {
        if (isGitHubMissing(error)) {
            usersByAccountId.set(accountId, null);
            return null;
        }
        throw error;
    }
}

function isGitHubMissing(error: unknown): boolean {
    const message = error instanceof Error ? error.message : "";
    const stderr = error && typeof error === "object" && "stderr" in error ? error.stderr : undefined;
    const stderrText = Buffer.isBuffer(stderr) ? stderr.toString("utf8") : typeof stderr === "string" ? stderr : "";
    return /\bHTTP (?:404|410)\b/u.test(`${message}\n${stderrText}`);
}

function isDefaultGitHubAvatar(login: string): Promise<boolean> {
    const normalized = normalizeLogin(login)?.toLowerCase();
    if (!normalized) {
        return Promise.resolve(false);
    }
    const cached = defaultAvatarByLogin.get(normalized);
    if (cached) {
        return cached;
    }
    const pending = probeDefaultGitHubAvatar(normalized);
    defaultAvatarByLogin.set(normalized, pending);
    return pending;
}

async function probeDefaultGitHubAvatar(login: string): Promise<boolean> {
    try {
        return await withAvatarProbeTimeout(login, async ({ signal, timeoutPromise }) => {
            const response = await fetch(`https://github.com/${login}.png?size=${AVATAR_PROBE_SIZE}`, {
                headers: { "user-agent": "workadventure-contributors" },
                signal,
            });
            if (!response.ok) {
                return false;
            }
            const buffer = await readAvatarProbeBuffer(response, timeoutPromise);
            const dimensions = readImageDimensions(buffer);
            return Boolean(
                dimensions && (dimensions.width > AVATAR_PROBE_SIZE || dimensions.height > AVATAR_PROBE_SIZE),
            );
        });
    } catch {
        return false;
    }
}

type AvatarProbeTimeout = {
    signal: AbortSignal;
    timeoutPromise: Promise<never>;
};

async function withAvatarProbeTimeout<T>(
    login: string,
    runProbe: (timeout: AvatarProbeTimeout) => Promise<T>,
): Promise<T> {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
            const error = new Error(`avatar probe for ${login} exceeded timeout of ${AVATAR_PROBE_TIMEOUT_MS}ms`);
            reject(error);
            controller.abort(error);
        }, AVATAR_PROBE_TIMEOUT_MS);
    });

    try {
        return await Promise.race([runProbe({ signal: controller.signal, timeoutPromise }), timeoutPromise]);
    } finally {
        if (timeout) {
            clearTimeout(timeout);
        }
    }
}

function toAvatarProbeError(value: unknown, fallbackMessage: string): Error {
    if (value instanceof Error) {
        return value;
    }
    if (typeof value === "string") {
        return new Error(value);
    }
    return new Error(fallbackMessage, { cause: value });
}

async function readAvatarProbeChunkWithTimeout(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    timeoutPromise: Promise<never> | undefined,
    markCanceled: () => void,
): Promise<ReadableStreamReadResult<Uint8Array>> {
    const readPromise = reader.read();
    if (!timeoutPromise) {
        return await readPromise;
    }

    let waitingForRead = true;
    const timeoutReadPromise = timeoutPromise.catch((error: unknown) => {
        if (waitingForRead) {
            markCanceled();
            cancelResponseReaderSoon(reader);
        }
        throw toAvatarProbeError(error, "avatar probe response body read timed out");
    });

    try {
        return await Promise.race([readPromise, timeoutReadPromise]);
    } finally {
        waitingForRead = false;
    }
}

async function readAvatarProbeArrayBuffer(
    response: Response,
    timeoutPromise: Promise<never> | undefined,
): Promise<ArrayBuffer> {
    if (!timeoutPromise) {
        return await response.arrayBuffer();
    }
    return await Promise.race([
        response.arrayBuffer(),
        timeoutPromise.catch((error: unknown) => {
            void response.body?.cancel().catch(() => undefined);
            throw toAvatarProbeError(error, "avatar probe response body read timed out");
        }),
    ]);
}

async function readAvatarProbeBuffer(response: Response, timeoutPromise?: Promise<never>): Promise<Buffer> {
    const contentLengthRaw = response.headers.get("content-length");
    if (contentLengthRaw && /^\d+$/u.test(contentLengthRaw)) {
        const contentLength = Number(contentLengthRaw);
        if (!Number.isSafeInteger(contentLength) || contentLength > AVATAR_PROBE_MAX_BYTES) {
            await response.body?.cancel().catch(() => undefined);
            throw new Error(`avatar probe exceeded ${AVATAR_PROBE_MAX_BYTES} bytes`);
        }
    }

    const reader = response.body?.getReader?.();
    if (!reader) {
        const buffer = Buffer.from(await readAvatarProbeArrayBuffer(response, timeoutPromise));
        if (buffer.byteLength > AVATAR_PROBE_MAX_BYTES) {
            throw new Error(`avatar probe exceeded ${AVATAR_PROBE_MAX_BYTES} bytes`);
        }
        return buffer;
    }

    const chunks: Buffer[] = [];
    let total = 0;
    let canceled = false;
    try {
        for (;;) {
            const { done, value } = await readAvatarProbeChunkWithTimeout(reader, timeoutPromise, () => {
                canceled = true;
            });
            if (done) {
                break;
            }
            if (!value?.byteLength) {
                continue;
            }
            const chunk = Buffer.from(value);
            const nextTotal = total + chunk.byteLength;
            if (nextTotal > AVATAR_PROBE_MAX_BYTES) {
                canceled = true;
                await reader.cancel().catch(() => undefined);
                throw new Error(`avatar probe exceeded ${AVATAR_PROBE_MAX_BYTES} bytes`);
            }
            chunks.push(chunk);
            total = nextTotal;
        }
    } finally {
        if (!canceled) {
            reader.releaseLock();
        }
    }
    return Buffer.concat(chunks, total);
}

async function filterVisibleEntries(entries: Entry[], hiddenLogins: ReadonlySet<string>): Promise<Entry[]> {
    const visible = new Array<boolean>(entries.length);
    let nextIndex = 0;
    await Promise.all(
        Array.from({ length: Math.min(8, entries.length) }, async () => {
            while (nextIndex < entries.length) {
                const index = nextIndex++;
                const entry = expectDefined(entries[index], "contributor entry");
                const login = entry.login ?? entry.key;
                const normalized = normalizeLogin(login)?.toLowerCase();
                visible[index] = !(normalized && hiddenLogins.has(normalized)) && !(await isDefaultGitHubAvatar(login));
            }
        }),
    );
    return entries.filter((_entry, index) => visible[index]);
}

function readImageDimensions(buffer: Buffer): { width: number; height: number } | null {
    if (isPng(buffer)) {
        return readPngDimensions(buffer);
    }
    if (isJpeg(buffer)) {
        return readJpegDimensions(buffer);
    }
    return null;
}

function isPng(buffer: Buffer): boolean {
    return (
        buffer.length >= 24 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
    );
}

function readPngDimensions(buffer: Buffer): { width: number; height: number } | null {
    if (buffer.length < 24) {
        return null;
    }
    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
    };
}

function isJpeg(buffer: Buffer): boolean {
    return buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8;
}

function readJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
    let offset = 2;
    while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) {
            offset += 1;
            continue;
        }

        const marker = expectDefined(buffer[offset + 1], `JPEG marker at byte ${offset + 1}`);
        offset += 2;

        if (marker === 0xd8 || marker === 0xd9) {
            continue;
        }
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
            continue;
        }
        if (offset + 2 > buffer.length) {
            return null;
        }

        const length = buffer.readUInt16BE(offset);
        if (length < 2 || offset + length > buffer.length) {
            return null;
        }

        if (
            (marker >= 0xc0 && marker <= 0xc3) ||
            (marker >= 0xc5 && marker <= 0xc7) ||
            (marker >= 0xc9 && marker <= 0xcb) ||
            (marker >= 0xcd && marker <= 0xcf)
        ) {
            if (length < 7) {
                return null;
            }
            return {
                height: buffer.readUInt16BE(offset + 3),
                width: buffer.readUInt16BE(offset + 5),
            };
        }

        offset += length;
    }
    return null;
}

function resolveLogin(
    name: string,
    email: string | null,
    apiByLoginValue: Map<string, User>,
    nameToLoginLocal: Record<string, string>,
    emailToLoginLocal: Record<string, string>,
): string | null {
    if (email && emailToLoginLocal[email]) {
        return normalizeLogin(emailToLoginLocal[email]);
    }

    // The account ID in modern noreply addresses survives login renames.
    // Never fall back to a potentially reused handle when that account is gone.
    const noreply = email?.match(/^(\d+)\+([^@]+)@users\.noreply\.github\.com$/);
    if (noreply) {
        const accountId = Number(noreply[1]);
        if (!Number.isSafeInteger(accountId) || accountId <= 0 || !normalizeLogin(noreply[2] ?? null)) {
            return null;
        }
        const user = fetchUserByAccountId(accountId);
        if (user) {
            apiByLoginValue.set(user.login.toLowerCase(), user);
        }
        return normalizeLogin(user?.login ?? null);
    }

    if (email && name) {
        const guessed = guessLoginFromEmailName(name, email, apiByLoginValue);
        if (guessed) {
            return normalizeLogin(guessed);
        }
    }

    if (email && email.endsWith("@users.noreply.github.com")) {
        const local = expectDefined(email.split("@", 1)[0], "GitHub noreply email local part");
        const login = local.includes("+")
            ? expectDefined(local.split("+")[1], "GitHub noreply email login suffix")
            : local;
        return normalizeLogin(login);
    }

    if (email && email.endsWith("@github.com")) {
        const login = expectDefined(email.split("@", 1)[0], "GitHub email local part");
        if (apiByLoginValue.has(login.toLowerCase())) {
            return normalizeLogin(login);
        }
    }

    const normalized = normalizeName(name);
    if (nameToLoginLocal[normalized]) {
        return normalizeLogin(nameToLoginLocal[normalized]);
    }

    const compact = normalized.replace(/\s+/g, "");
    if (nameToLoginLocal[compact]) {
        return normalizeLogin(nameToLoginLocal[compact]);
    }

    if (apiByLoginValue.has(normalized)) {
        return normalizeLogin(normalized);
    }

    if (apiByLoginValue.has(compact)) {
        return normalizeLogin(compact);
    }

    return null;
}

function guessLoginFromEmailName(name: string, email: string, apiByLoginLocal: Map<string, User>): string | null {
    const local = email.split("@", 1)[0]?.trim();
    if (!local) {
        return null;
    }
    const normalizedName = normalizeIdentifier(name);
    if (!normalizedName) {
        return null;
    }
    const candidates = new Set([local, local.replace(/[._-]/g, "")]);
    for (const candidate of candidates) {
        if (!candidate) {
            continue;
        }
        if (normalizeIdentifier(candidate) !== normalizedName) {
            continue;
        }
        const key = candidate.toLowerCase();
        if (apiByLoginLocal.has(key)) {
            return key;
        }
    }
    return null;
}

function normalizeIdentifier(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function escapeHtmlAttribute(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function parseReadmeEntries(content: string): Array<{ display: string; html_url: string | null; avatar_url: string }> {
    const rangeValue = findContributorsRange(content);
    if (!rangeValue) {
        return [];
    }
    const blockValue = content.slice(rangeValue.start, rangeValue.end);
    const entriesValue: Array<{
        display: string;
        html_url: string | null;
        avatar_url: string;
    }> = [];
    const markdown = /\[!\[([^\]]+)\]\(([^)]+)\)\]\(([^)]+)\)/g;
    for (const match of blockValue.matchAll(markdown)) {
        const [, alt, src, href] = match;
        if (!href || !src || !alt) {
            continue;
        }
        entriesValue.push({
            html_url: href,
            avatar_url: src,
            display: alt.replace(/\\([\\[\]])/g, "$1"),
        });
    }
    const linked = /<a href="([^"]+)"><img src="([^"]+)"[^>]*alt="([^"]+)"[^>]*>/g;
    for (const match of blockValue.matchAll(linked)) {
        const [, href, src, alt] = match;
        if (!href || !src || !alt) {
            continue;
        }
        entriesValue.push({ html_url: href, avatar_url: src, display: alt });
    }
    const standalone = /<img src="([^"]+)"[^>]*alt="([^"]+)"[^>]*>/g;
    for (const match of blockValue.matchAll(standalone)) {
        const [, src, alt] = match;
        if (!src || !alt) {
            continue;
        }
        if (entriesValue.some((entry) => entry.display === alt && entry.avatar_url === src)) {
            continue;
        }
        entriesValue.push({ html_url: null, avatar_url: src, display: alt });
    }
    return entriesValue;
}

function parseHiddenReadmeLogins(content: string): string[] {
    const rangeLocal = findHiddenReadmeRange(content);
    if (!rangeLocal) {
        return [];
    }
    const blockLocal = content.slice(rangeLocal.start, rangeLocal.end);
    return blockLocal
        .split("\n")
        .map((line) => normalizeLogin(line.trim())?.toLowerCase() ?? null)
        .filter((login): login is string => Boolean(login));
}

function buildHiddenReadmeBlock(entriesLocal: Entry[], visibleEntriesLocal: Entry[]): string {
    const visibleLogins = new Set(
        visibleEntriesLocal
            .map((entry) => normalizeLogin(entry.login ?? entry.key)?.toLowerCase() ?? null)
            .filter((login): login is string => Boolean(login)),
    );
    const hiddenLogins = entriesLocal
        .map((entry) => normalizeLogin(entry.login ?? entry.key)?.toLowerCase() ?? null)
        .filter((login): login is string => Boolean(login))
        .filter((login) => !visibleLogins.has(login))
        .toSorted((a, b) => a.localeCompare(b));
    const notice =
        "default-avatar-cache: hidden from the rendered wall because these users still use GitHub's default avatar";
    if (hiddenLogins.length === 0) {
        return `${CONTRIBUTORS_HIDDEN_START}\n${notice}\n${CONTRIBUTORS_HIDDEN_END}\n`;
    }
    return `${CONTRIBUTORS_HIDDEN_START}\n${notice}\n${hiddenLogins.join("\n")}\n${CONTRIBUTORS_HIDDEN_END}\n`;
}

function findContributorsRange(content: string): { start: number; end: number } | null {
    const markerStart = content.indexOf(CONTRIBUTORS_START);
    const markerEnd = content.indexOf(CONTRIBUTORS_END, markerStart);
    if (markerStart !== -1 && markerEnd !== -1) {
        return {
            start: markerStart,
            end: markerEnd + CONTRIBUTORS_END.length,
        };
    }

    return null;
}

function findHiddenReadmeRange(content: string): { start: number; end: number } | null {
    const markerStart = content.indexOf(CONTRIBUTORS_HIDDEN_START);
    const markerEnd = content.indexOf(CONTRIBUTORS_HIDDEN_END, markerStart);
    if (markerStart === -1 || markerEnd === -1) {
        return null;
    }
    return {
        start: markerStart,
        end: markerEnd + CONTRIBUTORS_HIDDEN_END.length,
    };
}

function loginFromUrl(url: string): string | null {
    const match = /^https?:\/\/github\.com\/([^/?#]+)/i.exec(url);
    if (!match) {
        return null;
    }
    const login = match[1];
    if (!login || login.toLowerCase() === "search") {
        return null;
    }
    return login;
}

function pickDisplay(baseName: string | null | undefined, login: string, existing?: string): string {
    const key = login.toLowerCase();
    if (displayName[key]) {
        return displayName[key];
    }
    if (existing) {
        return existing;
    }
    if (baseName) {
        return baseName;
    }
    return login;
}

function expectDefined<T>(value: T | undefined | null, label: string): T {
    if (value === undefined || value === null) {
        throw new Error(`Missing ${label}`);
    }
    return value;
}

function cancelResponseReaderSoon(reader: ReadableStreamDefaultReader<Uint8Array>): void {
    void Promise.resolve()
        .then(() => reader.cancel())
        .catch(() => undefined);
}
