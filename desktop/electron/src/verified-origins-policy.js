"use strict";

// White-label worlds: origins the portal's admin confirmed as worlds of its install
// (GET /api/desktop/verify-origin). They are trusted like *.workadventu.re for a limited time, so a
// domain removed from a world (and maybe registered by someone else since) stops being trusted.
const VERIFIED_ORIGIN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Origins whose confirmation has not expired. */
function activeVerifiedOrigins(stored, now = Date.now()) {
    if (!isRecord(stored)) {
        return [];
    }
    return Object.keys(stored).filter((origin) => typeof stored[origin] === "number" && stored[origin] > now);
}

/** The stored map with `origin` confirmed until now + TTL, expired entries dropped. */
function rememberVerifiedOrigin(stored, origin, now = Date.now(), ttlMs = VERIFIED_ORIGIN_TTL_MS) {
    const next = {};
    for (const active of activeVerifiedOrigins(stored, now)) {
        next[active] = stored[active];
    }
    next[origin] = now + ttlMs;
    return next;
}

/** The admin endpoint to ask about `url`, or undefined when the portal cannot be trusted to answer. */
function verifyOriginRequestUrl(portalUrl, url, allowInsecurePortal = false) {
    let portal;
    let target;
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

module.exports = {
    VERIFIED_ORIGIN_TTL_MS,
    activeVerifiedOrigins,
    rememberVerifiedOrigin,
    verifyOriginRequestUrl,
};
