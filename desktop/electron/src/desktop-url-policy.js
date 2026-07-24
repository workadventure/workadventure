"use strict";

const DEFAULT_PORTAL_URL = "http://admin.workadventure.localhost/";
const DEFAULT_ALLOWED_HOST_SUFFIXES_PROD = [".workadventu.re", ".workadventure.fr"];
const DEFAULT_ALLOWED_HOST_SUFFIXES_DEV = [".workadventu.re", ".workadventure.fr", ".workadventure.localhost"];
const SENSITIVE_QUERY_PARAMS = [
    "token",
    "matrixLoginToken",
    "code",
    "code_verifier",
    "id_token",
    "access_token",
    "refresh_token",
];
const MAX_WORLD_HISTORY_LENGTH = 10;
const BROKEN_PERSISTED_URLS = new Set([
    "http://play.workadventure.localhost/~/maps/areas.wam",
    "https://play.workadventure.localhost/~/maps/areas.wam",
    "https://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Areas/StartAreas/start_areas.json",
]);

function parseList(value) {
    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {
        return value.map((entry) => String(entry).trim()).filter(Boolean);
    }

    return String(value)
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function normalizeHostSuffix(value) {
    const trimmed = String(value || "")
        .trim()
        .toLowerCase();
    if (!trimmed) {
        return "";
    }
    return trimmed.startsWith(".") ? trimmed : "." + trimmed;
}

function isDevEnvironment() {
    return process.env.NODE_ENV === "development";
}

function getDefaultAllowedHostSuffixes() {
    return isDevEnvironment() ? DEFAULT_ALLOWED_HOST_SUFFIXES_DEV : DEFAULT_ALLOWED_HOST_SUFFIXES_PROD;
}

function normalizeHttpUrl(value, fallback) {
    try {
        const url = new URL(value || fallback);
        if (url.protocol !== "https:" && url.protocol !== "http:") {
            return new URL(fallback).toString();
        }
        return url.toString();
    } catch {
        return new URL(fallback).toString();
    }
}

function normalizeOrigin(value) {
    try {
        const url = new URL(value);
        if (url.protocol !== "https:" && url.protocol !== "http:") {
            return undefined;
        }
        return url.origin;
    } catch {
        return undefined;
    }
}

function createDesktopConfig(env = process.env) {
    const portalUrl = normalizePersistedPortalUrl(env.portalUrl || env.WA_DESKTOP_PORTAL_URL, DEFAULT_PORTAL_URL);
    const portalOrigin = new URL(portalUrl).origin;
    const allowedOrigins = new Set([portalOrigin]);

    for (const origin of parseList(env.allowedOrigins || env.WA_DESKTOP_ALLOWED_ORIGINS)) {
        const normalizedOrigin = normalizeOrigin(origin);
        if (normalizedOrigin) {
            allowedOrigins.add(normalizedOrigin);
        }
    }

    const configuredSuffixes = parseList(env.allowedHostSuffixes || env.WA_DESKTOP_ALLOWED_HOST_SUFFIXES)
        .map(normalizeHostSuffix)
        .filter(Boolean);
    const allowedHostSuffixes = (configuredSuffixes.length > 0 ? configuredSuffixes : getDefaultAllowedHostSuffixes())
        .map(normalizeHostSuffix)
        .filter(Boolean);

    return {
        portalUrl,
        portalOrigin,
        allowedOrigins: Array.from(allowedOrigins),
        allowedHostSuffixes,
        updateFeedUrl:
            env.updateFeedUrl || env.WA_DESKTOP_UPDATE_URL || "https://desktop-updates.workadventu.re/stable",
    };
}

function parseHttpUrl(value) {
    try {
        const url = new URL(value);
        if (url.protocol !== "https:" && url.protocol !== "http:") {
            return undefined;
        }
        return url;
    } catch {
        return undefined;
    }
}

function requireHttpsInProd(url) {
    if (!url) {
        return false;
    }
    if (url.protocol === "https:") {
        return true;
    }
    if (url.protocol !== "http:") {
        return false;
    }
    if (isDevEnvironment()) {
        return true;
    }
    return isLocalhost(url.hostname);
}

function isBrokenPersistedUrl(value) {
    const url = parseHttpUrl(value);
    return Boolean(url && BROKEN_PERSISTED_URLS.has(url.toString().replace(/\/$/, "")));
}

function normalizePersistedPortalUrl(value, fallback = DEFAULT_PORTAL_URL) {
    if (isBrokenPersistedUrl(value)) {
        return fallback;
    }

    return normalizeHttpUrl(value, fallback);
}

function normalizePersistedLastRoomUrl(value) {
    // BROKEN_PERSISTED_URLS is a portal_url migration list — those URLs were mistakenly seeded
    // as portal_url in an old buggy build. They are legitimate room URLs to navigate to today, so
    // we must NOT filter them here (that would silently drop them from world_history / last_room_url
    // even when the user genuinely visited them). If a persisted URL is actually unreachable, the
    // did-fail-load recovery bounces the user to Landing with an inline error instead.
    const url = parseHttpUrl(value);
    if (!url || url.username || url.password) {
        return undefined;
    }
    for (const param of SENSITIVE_QUERY_PARAMS) {
        url.searchParams.delete(param);
    }
    // Drop the fragment so hash-only changes (e.g. "#chat=1", "#lang=fr") don't create
    // spurious Recent worlds entries after every SPA state tweak.
    url.hash = "";
    return url.toString();
}

function normalizePersistedWorldHistory(value, limit = MAX_WORLD_HISTORY_LENGTH) {
    if (!Array.isArray(value)) {
        return [];
    }

    const normalizedHistory = [];
    const seen = new Set();
    const safeLimit = Math.max(0, Number.isFinite(limit) ? Math.floor(limit) : MAX_WORLD_HISTORY_LENGTH);
    if (safeLimit === 0) {
        return normalizedHistory;
    }
    for (const entry of value) {
        const normalized = normalizePersistedLastRoomUrl(typeof entry === "string" ? entry : undefined);
        if (!normalized || !isRoomUrl(normalized) || seen.has(normalized)) {
            continue;
        }
        normalizedHistory.push(normalized);
        seen.add(normalized);
        if (normalizedHistory.length >= safeLimit) {
            break;
        }
    }
    return normalizedHistory;
}

function addWorldToHistory(history, value, limit = MAX_WORLD_HISTORY_LENGTH) {
    return normalizePersistedWorldHistory([value, ...(Array.isArray(history) ? history : [])], limit);
}

function formatWorldHistoryLabel(value, maxLength = 58) {
    const url = parseHttpUrl(value);
    if (!url) {
        return "Unknown world";
    }

    const segments = url.pathname
        .split("/")
        .filter(Boolean)
        .map((segment) => {
            try {
                return decodeURIComponent(segment);
            } catch {
                return segment;
            }
        });
    const label =
        segments[0] === "@" && segments.length > 1
            ? segments.slice(1).join(" / ")
            : url.hostname + (url.pathname === "/" ? "" : url.pathname);
    const safeMaxLength = Math.max(8, Number.isFinite(maxLength) ? Math.floor(maxLength) : 58);
    return label.length > safeMaxLength ? label.slice(0, safeMaxLength - 1) + "…" : label;
}

function isLocalhost(hostname) {
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isAllowedNavigationUrl(value, config) {
    const url = parseHttpUrl(value);
    if (!url) {
        return false;
    }

    if (!requireHttpsInProd(url)) {
        return false;
    }

    if (config.allowedOrigins.includes(url.origin)) {
        return true;
    }

    if (isDevEnvironment() && isLocalhost(url.hostname)) {
        return true;
    }

    const hostname = url.hostname.toLowerCase();
    return config.allowedHostSuffixes.some((suffix) => {
        const normalized = normalizeHostSuffix(suffix);
        if (!normalized) {
            return false;
        }
        const bare = normalized.slice(1);
        return hostname === bare || hostname.endsWith(normalized);
    });
}

function isDesktopLoginUrl(value) {
    const url = parseHttpUrl(value);
    return Boolean(url && url.pathname === "/login-screen");
}

function isDesktopLogoutUrl(value) {
    const url = parseHttpUrl(value);
    return Boolean(url && url.pathname === "/logout");
}

function createDesktopFlowUrl(value) {
    const url = parseHttpUrl(value);
    if (!url) {
        return value;
    }

    url.searchParams.set("desktop", "true");
    return url.toString();
}

function createDesktopLoginUrl(value, desktopCallbackUrl) {
    const url = parseHttpUrl(createDesktopFlowUrl(value));
    if (!url) {
        return value;
    }

    if (desktopCallbackUrl) {
        url.searchParams.set("desktopCallbackUrl", desktopCallbackUrl);
    }

    return url.toString();
}

function createDesktopLogoutUrl(value, desktopCallbackUrl) {
    const url = parseHttpUrl(createDesktopFlowUrl(value));
    if (!url) {
        return value;
    }

    if (desktopCallbackUrl) {
        url.searchParams.set("desktopCallbackUrl", desktopCallbackUrl);
    }

    return url.toString();
}

function extractDesktopAuthCallback(value) {
    let url;
    try {
        url = new URL(value);
    } catch {
        return undefined;
    }

    if (url.protocol !== "workadventure:" || url.hostname !== "auth" || url.pathname !== "/callback") {
        return undefined;
    }

    const origin = normalizeOrigin(url.searchParams.get("origin"));
    const code = url.searchParams.get("code");
    if (!origin || !code) {
        return undefined;
    }

    const matrixLoginToken = url.searchParams.get("matrixLoginToken") || undefined;
    return { origin, code, matrixLoginToken };
}

function stripSensitiveQueryParams(value) {
    if (!value || typeof value !== "string") {
        return value;
    }
    const url = parseHttpUrl(value);
    if (!url) {
        return value;
    }
    let changed = false;
    for (const param of SENSITIVE_QUERY_PARAMS) {
        if (url.searchParams.has(param)) {
            url.searchParams.delete(param);
            changed = true;
        }
    }
    return changed ? url.toString() : value;
}

function redactSensitiveString(value) {
    if (typeof value !== "string" || value.length === 0) {
        return value;
    }
    let result = value;
    for (const param of SENSITIVE_QUERY_PARAMS) {
        const re = new RegExp("([?&]" + param + "=)[^&\\s\"']+", "gi");
        result = result.replace(re, "$1REDACTED");
    }
    return result;
}

function createRoomUrlWithAuthToken(targetUrl, token, matrixLoginToken) {
    const url = parseHttpUrl(targetUrl);
    if (!url) {
        return targetUrl;
    }

    url.searchParams.set("token", token);
    if (matrixLoginToken) {
        url.searchParams.set("matrixLoginToken", matrixLoginToken);
    }
    return url.toString();
}

function isRoomUrl(value) {
    const url = parseHttpUrl(value);
    if (!url) {
        return false;
    }

    // WorkAdventure exposes several room-path shapes:
    //   /@/{team}/{world}/{room}      — hosted admin worlds
    //   /_/{instance}/{host}/{map}    — anonymous/global maps
    //   /~/maps/{map}.wam             — admin-managed maps in dev/self-hosted
    //   /*/…                          — custom map storage prefixes
    // Anything else (`/`, `/login-screen`, `/logout`, `/admin/...`) is portal/auth, not a world.
    return (
        url.pathname.includes("/@/") ||
        url.pathname.includes("/_/") ||
        url.pathname.includes("/~/") ||
        url.pathname.includes("/*/")
    );
}

function validateDesktopNavigationUrl(value, config) {
    if (typeof value !== "string" || !value.trim()) {
        return { ok: false, error: "Please enter a world URL." };
    }

    let url;
    try {
        url = new URL(value.trim());
    } catch {
        return { ok: false, error: "Invalid URL. Please enter a full http(s):// world URL." };
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        return { ok: false, error: "Only http(s):// URLs are supported." };
    }
    if (!url.hostname || url.username || url.password) {
        return { ok: false, error: "Invalid URL — missing host or contains credentials." };
    }

    const normalizedUrl = url.toString();
    if (!isAllowedNavigationUrl(normalizedUrl, config)) {
        return {
            ok: false,
            error: "This URL isn't in the allowed origins. Set WA_DESKTOP_ALLOWED_ORIGINS or use a workadventu.re world URL.",
        };
    }

    return { ok: true, url: normalizedUrl };
}

function resolveInitialTarget(config, state = {}) {
    const candidates = [state.pendingDeepLinkUrl, state.lastRoomUrl, config.portalUrl];
    const target = candidates.find((candidate) => candidate && isAllowedNavigationUrl(candidate, config));
    return target || config.portalUrl;
}

function extractDesktopTargetFromDeepLink(value) {
    let url;
    try {
        url = new URL(value);
    } catch {
        return undefined;
    }

    if (url.protocol !== "workadventure:") {
        return undefined;
    }

    if (url.hostname === "join") {
        return url.searchParams.get("url") || url.searchParams.get("roomUrl") || undefined;
    }

    if (url.hostname === "auth" && url.pathname === "/callback") {
        if (extractDesktopAuthCallback(value)) {
            return undefined;
        }

        return (
            url.searchParams.get("url") ||
            url.searchParams.get("redirectUrl") ||
            url.searchParams.get("target") ||
            url.searchParams.get("roomUrl") ||
            undefined
        );
    }

    return undefined;
}

module.exports = {
    createDesktopConfig,
    createDesktopLoginUrl,
    createDesktopLogoutUrl,
    createRoomUrlWithAuthToken,
    extractDesktopAuthCallback,
    extractDesktopTargetFromDeepLink,
    isAllowedNavigationUrl,
    isDesktopLoginUrl,
    isDesktopLogoutUrl,
    isRoomUrl,
    addWorldToHistory,
    formatWorldHistoryLabel,
    validateDesktopNavigationUrl,
    normalizePersistedLastRoomUrl,
    normalizePersistedWorldHistory,
    normalizePersistedPortalUrl,
    resolveInitialTarget,
    stripSensitiveQueryParams,
    redactSensitiveString,
    SENSITIVE_QUERY_PARAMS,
    MAX_WORLD_HISTORY_LENGTH,
};
