import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

type Settings = {
    nameToLogin?: Record<string, string>;
    emailToLogin?: Record<string, string>;
};

type Profile = {
    id: number;
    login: string;
    html_url: string;
    avatar_url: string;
};

type Contribution = Partial<Profile> & { name?: string; email?: string; contributions?: number };
type Member = {
    profile: Profile;
    label: string;
    commits: number;
    pulls: number;
    lines: number;
    firstDay?: number;
};
type Tile = { label: string; image: string; link?: string };
type Section = { before: string; content: string; after: string };

const repository = "workadventure/workadventure";
const visibleMarkers = ["<!-- contributors:start -->", "<!-- contributors:end -->"] as const;
const hiddenMarkers = ["<!-- contributors:hidden:start", "contributors:hidden:end -->"] as const;

function command(executable: "git" | "gh", args: string[]): string {
    return execFileSync(executable, args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 120_000,
        maxBuffer: 64 * 1024 * 1024,
    }).trim();
}

function section(text: string, markers: readonly [string, string]): Section | undefined {
    const start = text.indexOf(markers[0]);
    const end = text.indexOf(markers[1], start + markers[0].length);
    if (start < 0 || end < 0) return undefined;
    return {
        before: text.slice(0, start + markers[0].length),
        content: text.slice(start + markers[0].length, end),
        after: text.slice(end),
    };
}

function replaceSection(text: string, markers: readonly [string, string], content: string): string {
    const found = section(text, markers);
    if (!found) throw new Error("README.md is missing contributors block");
    return `${found.before}\n${content}${content ? "\n" : ""}${found.after}`;
}

function dictionary(values: Record<string, string> = {}): Map<string, string> {
    return new Map(
        Object.entries(values).map(([key, value]) => [key.trim().toLowerCase().replace(/\s+/g, " "), value.trim()]),
    );
}

function day(value: string): number {
    return Math.floor(Date.parse(value.slice(0, 10)) / 86_400_000);
}

function escapeAttribute(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function attributes(tag: string): Map<string, string> {
    return new Map(
        [...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [
            match[1] ?? "",
            (match[2] ?? "")
                .replace(/&quot;/g, '"')
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&amp;/g, "&"),
        ]),
    );
}

function previousTiles(text: string): Tile[] {
    const content = section(text, visibleMarkers)?.content ?? "";
    const tiles = [...content.matchAll(/(?:<a\b[^>]*>\s*)?<img\b[^>]*>(?:\s*<\/a>)?/g)].flatMap(([tag]) => {
        const values = attributes(tag);
        const image = values.get("src");
        return image ? [{ image, label: values.get("alt") ?? "", link: values.get("href") }] : [];
    });
    for (const match of content.matchAll(/\[!\[((?:\\.|[^\]])*)\]\((\S+?)\)\]\((https?:\/\/[^)\s]+)\)/g)) {
        const [, label, image, link] = match;
        if (label && image && link) tiles.push({ label: label.replace(/\\([\\\[\]])/g, "$1"), image, link });
    }
    return tiles;
}

function avatarId(image: string): number | undefined {
    const url = new URL(image);
    const match = url.hostname === "avatars.githubusercontent.com" && /^\/u\/(\d+)$/.exec(url.pathname);
    return match ? Number(match[1]) : undefined;
}

function tileHtml(tile: Tile): string {
    const url = new URL(tile.image);
    url.searchParams.set("s", "48");
    const image = `<img src="${escapeAttribute(url.href)}" width="48" height="48" alt="${escapeAttribute(tile.label)}">`;
    return tile.link ? `<a href="${escapeAttribute(tile.link)}">${image}</a>` : image;
}

function imageDimensions(bytes: Buffer): [number, number] | undefined {
    if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
        return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
    }
    if (bytes.length < 2 || bytes.readUInt16BE(0) !== 0xffd8) return undefined;
    let offset = 2;
    while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
        const marker = bytes[offset + 1];
        if (marker === 0xff) {
            offset++;
            continue;
        }
        if (marker === 0xd9 || marker === 0xda) break;
        const size = bytes.readUInt16BE(offset + 2);
        if (size < 2 || offset + 2 + size > bytes.length) break;
        if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker ?? 0)) {
            if (size >= 7) return [bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5)];
        }
        offset += size + 2;
    }
    return undefined;
}

async function hasDefaultAvatar(login: string): Promise<boolean> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            controller.abort();
            reject(new Error("Avatar request timed out"));
        }, 8000);
    });
    try {
        return await Promise.race([
            deadline,
            (async () => {
                const response = await fetch(`https://github.com/${encodeURIComponent(login)}.png?size=40`, {
                    signal: controller.signal,
                });
                const limit = 256 * 1024;
                if (!response.ok || Number(response.headers.get("content-length")) > limit || !response.body)
                    return false;
                const reader = response.body.getReader();
                const chunks: Uint8Array[] = [];
                let length = 0;
                try {
                    for (;;) {
                        const part = await reader.read();
                        if (part.done) break;
                        length += part.value.length;
                        if (length > limit) return false;
                        chunks.push(part.value);
                    }
                } finally {
                    void reader.cancel().catch(() => {});
                }
                const dimensions = imageDimensions(Buffer.concat(chunks));
                return dimensions !== undefined && Math.max(...dimensions) > 40;
            })(),
        ]);
    } catch {
        // An unavailable avatar must not remove someone's credit.
        return false;
    } finally {
        clearTimeout(timer);
        controller.abort();
    }
}

async function main(): Promise<void> {
    const readme = readFileSync("README.md", "utf8");
    if (!section(readme, visibleMarkers)) throw new Error("README.md is missing contributors block");
    const settings: Settings = JSON.parse(
        readFileSync("contrib/tools/generate-contributors/contributors-map.json", "utf8"),
    );
    const names = dictionary(settings.nameToLogin);
    const emails = dictionary(settings.emailToLogin);
    const members = new Map<number, Member>();
    const profiles = new Map<string | number, Profile | null>();

    function remember(profile: Profile): Profile {
        profiles.set(profile.id, profile);
        profiles.set(profile.login.toLowerCase(), profile);
        return profile;
    }

    function lookup(identity: string | number): Profile | null {
        const key = typeof identity === "string" ? identity.toLowerCase() : identity;
        if (profiles.has(key)) return profiles.get(key) ?? null;
        let profile: Profile | null;
        try {
            profile = JSON.parse(command("gh", ["api", `${typeof key === "number" ? "user" : "users"}/${key}`]));
        } catch (error) {
            if (
                error &&
                typeof error === "object" &&
                "stderr" in error &&
                /HTTP (404|410)/.test(String(error.stderr))
            ) {
                profiles.set(key, null);
                return null;
            }
            throw error;
        }
        if (!profile || !profile.id || !profile.login || (typeof key === "number" && profile.id !== key)) {
            throw new Error(`Invalid GitHub profile for ${key}`);
        }
        profiles.set(key, profile);
        return remember(profile);
    }

    function member(profile: Profile): Member {
        let result = members.get(profile.id);
        if (!result) {
            result = {
                profile,
                label: profile.login,
                commits: 0,
                pulls: 0,
                lines: 0,
            };
            members.set(profile.id, result);
        }
        return result;
    }

    function author(name: string, email: string): Profile | null {
        const mappedEmail = emails.get(email.toLowerCase());
        if (mappedEmail) return lookup(mappedEmail);
        const noreply = /^(?:(\d+)\+)?([^@]+)@users\.noreply\.github\.com$/i.exec(email);
        if (noreply && !/^[a-z\d-]+$/i.test(noreply[2] ?? "")) return null;
        if (noreply?.[1]) {
            // The immutable ID takes precedence over a handle that may have been reused.
            return lookup(Number(noreply[1]));
        }
        const localPart = email.split("@")[0]?.toLowerCase() ?? "";
        const letters = (value: string) => value.toLowerCase().replace(/[^a-z\d]/g, "");
        if (letters(name) && letters(name) === letters(localPart)) {
            for (const candidate of [localPart, localPart.replace(/[._-]/g, "")]) {
                const profile = profiles.get(candidate);
                if (profile) return profile;
            }
        }
        if (noreply?.[2]) return lookup(noreply[2]);
        if (email.toLowerCase().endsWith("@github.com") && profiles.has(localPart)) {
            return profiles.get(localPart) ?? null;
        }
        const normalized = name.trim().toLowerCase().replace(/\s+/g, " ");
        const compact = normalized.replace(/ /g, "");
        const mappedName = names.get(normalized) ?? names.get(compact);
        const candidate = mappedName ?? (profiles.has(normalized) ? normalized : compact);
        if (!/^[a-z\d-]+$/i.test(candidate)) return null;
        return mappedName ? lookup(mappedName) : (profiles.get(candidate) ?? null);
    }

    const pages: Contribution[][] = JSON.parse(
        command("gh", ["api", `repos/${repository}/contributors?anon=1&per_page=100`, "--paginate", "--slurp"]),
    );
    for (const record of pages.flat()) {
        if (record.id && record.login && record.html_url && record.avatar_url) {
            const profile = remember({
                id: record.id,
                login: record.login,
                html_url: record.html_url,
                avatar_url: record.avatar_url,
            });
            member(profile).commits += record.contributions ?? 0;
        }
    }
    for (const record of pages.flat()) {
        if (record.login) continue;
        const profile = author(record.name ?? "", record.email ?? "");
        if (profile && !members.has(profile.id)) member(profile).commits = record.contributions ?? 0;
    }

    const history = command("git", ["log", "--reverse", "--format=%aN%x1f%aE%x1f%aI", "--numstat"]);
    let current: Member | undefined;
    for (const line of history.split("\n")) {
        const fields = line.split("\x1f");
        if (fields.length === 3) {
            const profile = author(fields[0]?.trim() ?? "", fields[1]?.trim() ?? "");
            current = profile ? member(profile) : undefined;
            if (current && fields[2]) {
                const date = day(fields[2]);
                current.firstDay = Math.min(current.firstDay ?? date, date);
            }
        } else if (current) {
            const [added, removed, path] = line.split("\t");
            if (path && !path.startsWith("docs/")) {
                current.lines += (Number(added) || 0) + (Number(removed) || 0);
            }
        }
    }

    const authors = command("gh", [
        "pr",
        "list",
        "--repo",
        repository,
        "--state",
        "merged",
        "--limit",
        "5000",
        "--json",
        "author",
        "--jq",
        ".[].author.login",
    ]);
    // The aggregate endpoint is cached; a just-merged PR must still add its author.
    for (const login of authors.split("\n").filter(Boolean)) {
        const profile = lookup(login);
        if (profile) member(profile).pulls++;
    }
    const unlinked = new Map<string, Tile>();
    for (const tile of previousTiles(readme)) {
        const id = avatarId(tile.image);
        const linkLogin = tile.link && /^https:\/\/github\.com\/([^/]+)$/.exec(tile.link)?.[1];
        const image = new URL(tile.image);
        const known = [...members.values()].find(({ profile }) => {
            const avatar = new URL(profile.avatar_url);
            return avatar.origin === image.origin && avatar.pathname === image.pathname;
        });
        const profile = id !== undefined ? lookup(id) : linkLogin ? lookup(linkLogin) : (known?.profile ?? null);
        if (profile) {
            const entry = member(profile);
            entry.label = tile.label || profile.login;
        } else {
            unlinked.set(tile.image, { ...tile, link: undefined });
        }
    }

    const hidden = new Set(
        (section(readme, hiddenMarkers)?.content ?? "")
            .split("\n")
            .map((login) => login.trim().toLowerCase())
            .filter((login) => /^[a-z\d-]+(?:\[bot\])?$/.test(login)),
    );
    const queue = [...members.values()];
    await Promise.all(
        Array.from({ length: 8 }, async () => {
            for (;;) {
                const next = queue.shift();
                if (!next) return;
                const login = next.profile.login.toLowerCase();
                if (!hidden.has(login) && (await hasDefaultAvatar(next.profile.login))) hidden.add(login);
            }
        }),
    );

    const root = command("git", ["rev-list", "--max-parents=0", "HEAD"]).split("\n")[0];
    if (!root) throw new Error("Git history has no root commit");
    const today = day(new Date().toISOString());
    const age = Math.max(1, today - day(command("git", ["log", "--format=%aI", "-1", root])));
    const ranked = [...members.values()].map((entry) => {
        const tenure = Math.min(1, Math.max(0, today - (entry.firstDay ?? today)) / age);
        const score = (entry.commits * 2 + entry.pulls * 10 + Math.sqrt(entry.lines)) * (1 + tenure ** 2 / 2);
        return { entry, score };
    });
    ranked.sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label));
    const tiles = ranked
        .filter(({ entry }) => !hidden.has(entry.profile.login.toLowerCase()))
        .map(({ entry }) =>
            tileHtml({ image: entry.profile.avatar_url, label: entry.label, link: entry.profile.html_url }),
        );
    tiles.push(...[...unlinked.values()].sort((a, b) => a.label.localeCompare(b.label)).map(tileHtml));
    const rows = [];
    for (let i = 0; i < tiles.length; i += 10) rows.push(tiles.slice(i, i + 10).join(" "));
    let updated = replaceSection(readme, visibleMarkers, rows.join("\n"));
    const cache = [...hidden].sort().join("\n");
    if (section(updated, hiddenMarkers)) {
        updated = replaceSection(updated, hiddenMarkers, cache);
    } else if (cache) {
        updated = updated.replace(
            visibleMarkers[1],
            `${visibleMarkers[1]}\n${hiddenMarkers[0]}\n${cache}\n${hiddenMarkers[1]}`,
        );
    }
    if (updated !== readme) writeFileSync("README.md", updated);
    console.log(`Contributor avatars: ${tiles.length} visible, ${hidden.size} default avatars hidden`);
}

await main();
