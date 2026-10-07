export type DesktopConfig = {
    portalUrl: string;
    portalOrigin: string;
    allowedOrigins: string[];
    allowedHostSuffixes: string[];
    updateFeedUrl: string;
};

export type DesktopAuthCallback = {
    origin: string;
    code: string;
    matrixLoginToken?: string;
};

export type DesktopNavigationErrorCode = "urlRequired" | "urlInvalid" | "urlProtocol" | "urlHost" | "urlNotAllowed";

export type DesktopNavigationValidationResult =
    | { ok: true; url: string }
    | { ok: false; code: DesktopNavigationErrorCode; error: string };

const DEV_PORTAL_URL = "http://admin.workadventure.localhost/";
const PROD_PORTAL_URL = "https://admin.workadventu.re/";
const DEFAULT_ALLOWED_HOST_SUFFIXES_PROD = [".workadventu.re", ".workadventure.fr"];
const DEFAULT_ALLOWED_HOST_SUFFIXES_DEV = [".workadventu.re", ".workadventure.fr", ".workadventure.localhost"];
export const SENSITIVE_QUERY_PARAMS: readonly string[] = [
    "token",
    "matrixLoginToken",
    "code",
    "code_verifier",
    "id_token",
    "access_token",
    "refresh_token",
];
export const MAX_WORLD_HISTORY_LENGTH = 10;
const BROKEN_PERSISTED_URLS = new Set([
    "http://play.workadventure.localhost/~/maps/areas.wam",
    "https://play.workadventure.localhost/~/maps/areas.wam",
    "https://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Areas/StartAreas/start_areas.json",
]);

function parseList(value: unknown): string[] {
    const entries = Array.isArray(value)
        ? value.map((entry) => String(entry))
        : typeof value === "string"
        ? value.split(",")
        : [];
    return entries.map((entry) => entry.trim()).filter(Boolean);
}

/** A setting given as a non-empty string, else undefined. */
function stringSetting(value: unknown): string | undefined {
    return typeof value === "string" && value ? value : undefined;
}

function normalizeHostSuffix(value: string): string {
    const trimmed = (value || "").trim().toLowerCase();
    if (!trimmed) {
        return "";
    }
    return trimmed.startsWith(".") ? trimmed : "." + trimmed;
}

function isDevEnvironment(): boolean {
    return process.env.NODE_ENV === "development";
}

// A packaged build must never fall back to the local dev stack: `http:` on a non-localhost host is
// refused outside development, so every "back to the portal" path would land on a dead page.
export function getDefaultPortalUrl(): string {
    return isDevEnvironment() ? DEV_PORTAL_URL : PROD_PORTAL_URL;
}

function getDefaultAllowedHostSuffixes(): string[] {
    return isDevEnvironment() ? DEFAULT_ALLOWED_HOST_SUFFIXES_DEV : DEFAULT_ALLOWED_HOST_SUFFIXES_PROD;
}

function normalizeHttpUrl(value: string | undefined, fallback: string): string {
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

function normalizeOrigin(value: string | null | undefined): string | undefined {
    try {
        const url = new URL(value ?? "");
        if (url.protocol !== "https:" && url.protocol !== "http:") {
            return undefined;
        }
        return url.origin;
    } catch {
        return undefined;
    }
}

export function createDesktopConfig(env: Record<string, unknown> = process.env): DesktopConfig {
    const portalUrl = normalizePersistedPortalUrl(
        stringSetting(env.portalUrl) ?? stringSetting(env.WA_DESKTOP_PORTAL_URL),
        getDefaultPortalUrl()
    );
    const portalOrigin = new URL(portalUrl).origin;
    const allowedOrigins = new Set([portalOrigin]);

    // `verifiedOrigins`: white-label worlds the portal's admin confirmed (see verified-origins-policy).
    const extraOrigins = [
        ...parseList(env.allowedOrigins || env.WA_DESKTOP_ALLOWED_ORIGINS),
        ...parseList(env.verifiedOrigins),
    ];
    for (const origin of extraOrigins) {
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
            stringSetting(env.updateFeedUrl) ??
            stringSetting(env.WA_DESKTOP_UPDATE_URL) ??
            "https://desktop-updates.workadventu.re/stable",
    };
}

function parseHttpUrl(value: string | undefined): URL | undefined {
    try {
        const url = new URL(value ?? "");
        if (url.protocol !== "https:" && url.protocol !== "http:") {
            return undefined;
        }
        return url;
    } catch {
        return undefined;
    }
}

function requireHttpsInProd(url: URL | undefined): boolean {
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

function isBrokenPersistedUrl(value: string | undefined): boolean {
    const url = parseHttpUrl(value);
    return Boolean(url && BROKEN_PERSISTED_URLS.has(url.toString().replace(/\/$/, "")));
}

export function normalizePersistedPortalUrl(value?: string, fallback = getDefaultPortalUrl()): string {
    if (isBrokenPersistedUrl(value)) {
        return fallback;
    }

    return normalizeHttpUrl(value, fallback);
}

export function normalizePersistedLastRoomUrl(value?: string): string | undefined {
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

export function normalizePersistedWorldHistory(value: unknown, limit = MAX_WORLD_HISTORY_LENGTH): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    const normalizedHistory: string[] = [];
    const seen = new Set<string>();
    const safeLimit = Math.max(0, Number.isFinite(limit) ? Math.floor(limit) : MAX_WORLD_HISTORY_LENGTH);
    if (safeLimit === 0) {
        return normalizedHistory;
    }
    for (const entry of value as unknown[]) {
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

export function addWorldToHistory(history: unknown, value: string, limit = MAX_WORLD_HISTORY_LENGTH): string[] {
    return normalizePersistedWorldHistory([value, ...(Array.isArray(history) ? (history as unknown[]) : [])], limit);
}

export function formatWorldHistoryLabel(value: string, maxLength = 58): string {
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

function isLocalhost(hostname: string): boolean {
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isAllowedNavigationUrl(value: string, config: DesktopConfig): boolean {
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

export function isDesktopLoginUrl(value: string): boolean {
    const url = parseHttpUrl(value);
    return Boolean(url && url.pathname === "/login-screen");
}

export function isDesktopLogoutUrl(value: string): boolean {
    const url = parseHttpUrl(value);
    return Boolean(url && url.pathname === "/logout");
}

function createDesktopFlowUrl(value: string): string {
    const url = parseHttpUrl(value);
    if (!url) {
        return value;
    }

    url.searchParams.set("desktop", "true");
    return url.toString();
}

export function createDesktopLoginUrl(value: string, desktopCallbackUrl?: string): string {
    const url = parseHttpUrl(createDesktopFlowUrl(value));
    if (!url) {
        return value;
    }

    if (desktopCallbackUrl) {
        url.searchParams.set("desktopCallbackUrl", desktopCallbackUrl);
    }

    return url.toString();
}

export function createDesktopLogoutUrl(value: string, desktopCallbackUrl?: string): string {
    const url = parseHttpUrl(createDesktopFlowUrl(value));
    if (!url) {
        return value;
    }

    if (desktopCallbackUrl) {
        url.searchParams.set("desktopCallbackUrl", desktopCallbackUrl);
    }

    return url.toString();
}

export function extractDesktopAuthCallback(value: string): DesktopAuthCallback | undefined {
    let url: URL;
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

export function stripSensitiveQueryParams(value: string | undefined): string | undefined {
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

export function redactSensitiveString(value: string | undefined): string | undefined {
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

export function createRoomUrlWithAuthToken(targetUrl: string, token: string, matrixLoginToken?: string): string {
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

export function isRoomUrl(value: string): boolean {
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

/**
 * The world a room URL belongs to, to find the tab that already shows it. Rooms of the same world share
 * a key: /@/{team}/{world} on an admin-hosted server, the whole server for map-storage rooms (the ~ and
 * * paths), since a server without an admin is a single world. A public map (/_/) is a world of its own.
 * Undefined for anything that is not a room (Landing, portal, login).
 */
export function worldKeyOf(value: string): string | undefined {
    const url = parseHttpUrl(value);
    if (!url || !isRoomUrl(url.toString())) {
        return undefined;
    }
    const segments = url.pathname.split("/");
    const at = segments.indexOf("@");
    if (at !== -1 && segments[at + 1] && segments[at + 2]) {
        return `${url.origin}/@/${segments[at + 1]}/${segments[at + 2]}`;
    }
    if (segments.includes("_")) {
        return url.origin + url.pathname;
    }
    return url.origin;
}

// `error` is the English text; `code` lets the caller show it in the user's language
// (landing.<code> in the native catalog).
export function validateDesktopNavigationUrl(value: unknown, config: DesktopConfig): DesktopNavigationValidationResult {
    if (typeof value !== "string" || !value.trim()) {
        return { ok: false, code: "urlRequired", error: "Please enter a world URL." };
    }

    let url: URL;
    try {
        url = new URL(value.trim());
    } catch {
        return { ok: false, code: "urlInvalid", error: "Invalid URL. Please enter a full http(s):// world URL." };
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        return { ok: false, code: "urlProtocol", error: "Only http(s):// URLs are supported." };
    }
    if (!url.hostname || url.username || url.password) {
        return { ok: false, code: "urlHost", error: "Invalid URL — missing host or contains credentials." };
    }

    const normalizedUrl = url.toString();
    if (!isAllowedNavigationUrl(normalizedUrl, config)) {
        return {
            ok: false,
            code: "urlNotAllowed",
            error: "This URL isn't in the allowed origins. Set WA_DESKTOP_ALLOWED_ORIGINS or use a workadventu.re world URL.",
        };
    }

    return { ok: true, url: normalizedUrl };
}

export function resolveInitialTarget(
    config: DesktopConfig,
    state: { pendingDeepLinkUrl?: string; lastRoomUrl?: string } = {}
): string {
    const candidates = [state.pendingDeepLinkUrl, state.lastRoomUrl, config.portalUrl];
    const target = candidates.find((candidate) => candidate && isAllowedNavigationUrl(candidate, config));
    return target || config.portalUrl;
}

export function extractDesktopTargetFromDeepLink(value: string): string | undefined {
    let url: URL;
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
