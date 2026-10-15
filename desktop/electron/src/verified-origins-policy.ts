// White-label worlds: origins the portal's admin confirmed as worlds of its install
// (GET /api/desktop/verify-origin). They are trusted like *.workadventu.re for a limited time, so a
// domain removed from a world (and maybe registered by someone else since) stops being trusted.
export const VERIFIED_ORIGIN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Confirmed origins → expiry, the entries that have not expired. */
function activeEntries(stored: unknown, now: number): [string, number][] {
    if (!isRecord(stored)) {
        return [];
    }
    return Object.entries(stored).filter(
        (entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] > now
    );
}

/** Origins whose confirmation has not expired. */
export function activeVerifiedOrigins(stored: unknown, now = Date.now()): string[] {
    return activeEntries(stored, now).map(([origin]) => origin);
}

/** The stored map with `origin` confirmed until now + TTL, expired entries dropped. */
export function rememberVerifiedOrigin(
    stored: unknown,
    origin: string,
    now = Date.now(),
    ttlMs = VERIFIED_ORIGIN_TTL_MS
): Record<string, number> {
    const next = Object.fromEntries(activeEntries(stored, now));
    next[origin] = now + ttlMs;
    return next;
}

/** The admin endpoint to ask about `url`, or undefined when the portal cannot be trusted to answer. */
export function verifyOriginRequestUrl(
    portalUrl: string,
    url: string,
    allowInsecurePortal = false
): string | undefined {
    let portal: URL;
    let target: URL;
    try {
        portal = new URL(portalUrl);
        target = new URL(url);
    } catch {
        return undefined;
    }
    if (target.protocol !== "https:" && target.protocol !== "http:") {
        return undefined;
    }
    if (portal.protocol !== "https:" && !(allowInsecurePortal && portal.protocol === "http:")) {
        return undefined;
    }
    const request = new URL("/api/desktop/verify-origin", portal.origin);
    request.searchParams.set("origin", target.origin);
    return request.toString();
}

// Self-hosted worlds: servers the user added by hand from the Landing (no admin to ask). Kept until
// removed; capped so a settings file cannot grow without bound.
export const MAX_TRUSTED_SERVERS = 50;

/**
 * The origin a user may add by hand, or undefined: a web URL without username/password, over https
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
