export type DesktopConfig = {
    portalUrl: string;
    portalOrigin: string;
    allowedOrigins: string[];
    updateFeedUrl: string | undefined;
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
// The hosted service's worlds, next to its portal. Trusted like any other server: by origin, no wildcard. An
// organization sets its own with WA_DESKTOP_ALLOWED_ORIGINS; users add theirs from the Landing.
const DEFAULT_ALLOWED_ORIGINS = ["https://play.workadventu.re"];
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
    if (Array.isArray(value)) {
        return value.map((entry) => String(entry).trim()).filter(Boolean);
    }
    if (typeof value !== "string") {
        return [];
    }

    return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function isDevEnvironment(): boolean {
    return process.env.NODE_ENV === "development";
}

// A packaged build must never fall back to the local dev stack: `http:` on a non-localhost host is
// refused outside development, so every "back to the portal" path would land on a dead page.
export function getDefaultPortalUrl(): string {
    return isDevEnvironment() ? DEV_PORTAL_URL : PROD_PORTAL_URL;
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

function normalizeOrigin(value: string | null): string | undefined {
    if (!value) {
        return undefined;
    }
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

function nonEmptyString(value: unknown): string | undefined {
    return typeof value === "string" && value ? value : undefined;
}

export function createDesktopConfig(env: Record<string, unknown> = process.env): DesktopConfig {
    const portalUrl = normalizePersistedPortalUrl(
        nonEmptyString(env.portalUrl) ?? nonEmptyString(env.WA_DESKTOP_PORTAL_URL),
        getDefaultPortalUrl()
    );
    const portalOrigin = new URL(portalUrl).origin;
    const allowedOrigins = new Set<string>();

    // `trustedOrigins`: the servers the user added (see trusted-servers-policy).
    const configuredOrigins = parseList(env.allowedOrigins || env.WA_DESKTOP_ALLOWED_ORIGINS);
    const extraOrigins = [
        ...(configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS),
        ...parseList(env.trustedOrigins),
    ];
    for (const origin of extraOrigins) {
        const normalizedOrigin = normalizeOrigin(origin);
        if (normalizedOrigin) {
            allowedOrigins.add(normalizedOrigin);
        }
    }

    return {
        portalUrl,
        portalOrigin,
        allowedOrigins: Array.from(allowedOrigins),
        // Unset: the releases on GitHub (the publish settings of electron-builder.yml). Set: a feed of the
        // organization's own, e.g. to hold versions back until they are validated internally.
        updateFeedUrl: nonEmptyString(env.updateFeedUrl) ?? nonEmptyString(env.WA_DESKTOP_UPDATE_URL),
    };
}

function parseHttpUrl(value: string | undefined): URL | undefined {
    if (!value) {
        return undefined;
    }
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
    // spurious Recent rooms entries after every SPA state tweak.
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

    // The administration (the portal) is not a world: its pages open in the browser, never in the app. The app
    // only calls its API, with net.fetch, which this does not gate.
    if (!requireHttpsInProd(url) || url.origin === config.portalOrigin) {
        return false;
    }

    if (config.allowedOrigins.includes(url.origin)) {
        return true;
    }

    // The local stack: *.workadventure.localhost. Only in development: a packaged app does not trust a name
    // that someone on the network might answer for.
    return isDevEnvironment() && (isLocalhost(url.hostname) || url.hostname.endsWith(".localhost"));
}

export function isDesktopLoginUrl(value: string): boolean {
    const url = parseHttpUrl(value);
    return Boolean(url && url.pathname === "/login-screen");
}

export function isDesktopLogoutUrl(value: string): boolean {
    const url = parseHttpUrl(value);
    return Boolean(url && url.pathname === "/logout");
}

/**
 * A page that signs the user in or out of a world the app trusts: its `playUri`, which the server sends the user
 * back to. The page itself may be on another origin than the world: the pusher (pusher.workadventu.re next to
 * play.workadventu.re) or the administration. The world vouches for it.
 */
function isTrustedWorldAuthPage(url: URL | undefined, config: DesktopConfig): url is URL {
    const world = url?.searchParams.get("playUri");
    return !!url && requireHttpsInProd(url) && !!world && isAllowedNavigationUrl(world, config);
}

/** The pusher's sign-in or sign-out page of a trusted world: the app runs it in the browser. */
export function isDesktopBrowserFlowUrl(value: string, config: DesktopConfig): boolean {
    const url = parseHttpUrl(value);
    return isTrustedWorldAuthPage(url, config) && (url.pathname === "/login-screen" || url.pathname === "/logout");
}

/**
 * A trusted world's sign-out page other than the pusher's (the administration's /oauth/logout): it loads in the
 * app, and redirects back to the world there. In the browser, the user would end up in the world in the browser.
 */
export function isWorldSignOutUrl(value: string, config: DesktopConfig): boolean {
    const url = parseHttpUrl(value);
    return isTrustedWorldAuthPage(url, config) && url.pathname.endsWith("/logout");
}

/**
 * Where the Back link of the screen shown during a browser sign-in or sign-out leads: the world the user
 * asked to sign in or out from, or undefined for the Landing. A world that sent the user to sign in on
 * its own requires it: going back to it would only start the sign-in again.
 */
export function desktopBrowserFlowReturnUrl(flowUrl: string, config: DesktopConfig): string | undefined {
    const url = parseHttpUrl(flowUrl);
    const world = url?.searchParams.get("playUri");
    if (!url || !world || !isAllowedNavigationUrl(world, config)) {
        return undefined;
    }
    if (isDesktopLoginUrl(flowUrl) && url.searchParams.get("manuallyTriggered") !== "true") {
        return undefined;
    }
    return world;
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
    // WorkAdventure exposes several room-path shapes:
    //   /@/{team}/{world}/{room}      — hosted admin worlds
    //   /_/{instance}/{host}/{map}    — anonymous/global maps
    //   /~/maps/{map}.wam             — admin-managed maps in dev/self-hosted
    //   /*/…                          — custom map storage prefixes
    // Anything else (`/`, `/login-screen`, `/logout`, `/admin/...`, `/_matrix/...`) is not a world. Anchored:
    // a page of another site whose path merely contains `/_/` is not one either.
    const url = parseHttpUrl(value);
    return !!url && /^\/[@_~*]\//.test(url.pathname);
}

/**
 * Whether a link the user followed opens in the app. Only worlds do: anything else (a chat file, the docs,
 * any other site) opens in the browser, since loaded as a world it would fail and throw the user back to
 * the Landing. A world tab may still move within its own server (`from`), e.g. to / and its redirect.
 */
export function opensInApp(url: string, config: DesktopConfig, from?: string): boolean {
    if (!isAllowedNavigationUrl(url, config)) {
        return false;
    }
    if (isRoomUrl(url)) {
        return true;
    }
    const current = parseHttpUrl(from);
    return !!current && parseHttpUrl(url)?.origin === current.origin;
}

/** The same room: same server and path. The query (tokens) and the #entry don't make another room. */
export function isSameRoomUrl(a: string, b: string): boolean {
    const left = parseHttpUrl(a);
    const right = parseHttpUrl(b);
    return Boolean(left && right && left.origin === right.origin && left.pathname === right.pathname);
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
        return { ok: false, code: "urlRequired", error: "Please enter a room URL." };
    }

    let url: URL;
    try {
        url = new URL(value.trim());
    } catch {
        return { ok: false, code: "urlInvalid", error: "Invalid URL. Please enter a full http(s):// room URL." };
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
            error: "This URL isn't in the allowed origins. Set WA_DESKTOP_ALLOWED_ORIGINS or use a play.workadventu.re room URL.",
        };
    }

    return { ok: true, url: normalizedUrl };
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
