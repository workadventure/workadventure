"use strict";

const DEFAULT_PORTAL_URL = "http://admin.workadventure.localhost/";
const DEFAULT_ALLOWED_HOST_SUFFIXES_PROD = [".workadventu.re", ".workadventure.fr"];
const DEFAULT_ALLOWED_HOST_SUFFIXES_DEV = [
    ".workadventu.re",
    ".workadventure.fr",
    ".workadventure.localhost",
];
const SENSITIVE_QUERY_PARAMS = ["token", "code", "code_verifier", "id_token", "access_token", "refresh_token"];
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
    const trimmed = String(value || "").trim().toLowerCase();
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
    if (isBrokenPersistedUrl(value)) {
        return undefined;
    }

    const url = parseHttpUrl(value);
    if (!url) {
        return undefined;
    }
    for (const param of SENSITIVE_QUERY_PARAMS) {
        url.searchParams.delete(param);
    }
    return url.toString();
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

    return { origin, code };
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

function createRoomUrlWithAuthToken(targetUrl, token) {
    const url = parseHttpUrl(targetUrl);
    if (!url) {
        return targetUrl;
    }

    url.searchParams.set("token", token);
    return url.toString();
}

function isRoomUrl(value) {
    const url = parseHttpUrl(value);
    if (!url) {
        return false;
    }

    return url.pathname.includes("/@/") || url.pathname.includes("/_/");
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
    normalizePersistedLastRoomUrl,
    normalizePersistedPortalUrl,
    resolveInitialTarget,
    stripSensitiveQueryParams,
    redactSensitiveString,
    SENSITIVE_QUERY_PARAMS,
};
