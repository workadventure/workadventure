// Worlds outside the built-in domains (self-hosted servers, white-label domains): servers the user added
// from the Landing. Kept until removed; capped so a settings file cannot grow without bound.
export const MAX_TRUSTED_SERVERS = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Whether `body`, a server's /server.json (served by every WorkAdventure server since 2022), looks like
 * WorkAdventure's. Not a proof, since anyone can serve it: it only keeps other sites (a search engine, a typo)
 * from being offered at all. The user still decides whether to add the server.
 */
export function isWorkAdventureServerInfo(body: unknown): boolean {
    return isRecord(body) && typeof body.motd === "string" && typeof body.version === "string";
}

/**
 * The origin a user may add, or undefined: a web URL without username/password, over https
 * (http only in development, since the page gets the native API and would be open to tampering).
 */
export function trustableOrigin(url: unknown, allowHttp = false): string | undefined {
    let target: URL;
    try {
        target = new URL(typeof url === "string" ? url.trim() : "");
    } catch {
        return undefined;
    }
    if (!target.hostname || target.username || target.password) {
        return undefined;
    }
    if (target.protocol !== "https:" && !(allowHttp && target.protocol === "http:")) {
        return undefined;
    }
    return target.origin;
}

function storedServers(stored: unknown): string[] {
    return Array.isArray(stored) ? stored.filter((entry): entry is string => typeof entry === "string") : [];
}

/** The trusted servers with `origin` added (most recent first, deduplicated, capped). */
export function addTrustedServer(stored: unknown, origin: string): string[] {
    return [origin, ...storedServers(stored).filter((entry) => entry !== origin)].slice(0, MAX_TRUSTED_SERVERS);
}

/** The trusted servers without `origin`. */
export function removeTrustedServer(stored: unknown, origin: string): string[] {
    return storedServers(stored).filter((entry) => entry !== origin);
}
