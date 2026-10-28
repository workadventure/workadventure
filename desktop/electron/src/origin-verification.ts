import { net } from "electron";
import ElectronLog from "electron-log";
import settings from "./settings";
import { createDesktopConfig, isAllowedNavigationUrl, type DesktopConfig } from "./desktop-url-policy";
import {
    activeVerifiedOrigins,
    addTrustedServer,
    rememberVerifiedOrigin,
    removeTrustedServer,
    trustableOrigin,
    verifyOriginRequestUrl,
} from "./verified-origins-policy";

const VERIFY_TIMEOUT_MS = 5000;

/** The desktop config, including the white-label origins the portal confirmed and that have not expired. */
export function getDesktopConfig(): DesktopConfig {
    return createDesktopConfig({
        ...process.env,
        portalUrl: settings.get("portal_url"),
        verifiedOrigins: [
            ...activeVerifiedOrigins(settings.get("verified_origins")),
            ...(settings.get("trusted_origins") ?? []),
        ],
    });
}

function isDevelopment(): boolean {
    return process.env.NODE_ENV === "development";
}

/**
 * The origin the user could add by hand for `url` (a self-hosted server: no admin to vouch for it),
 * or undefined. Only offered from the native Landing, for an address the user typed.
 */
export function originUserMayTrust(url: string): string | undefined {
    return trustableOrigin(url, isDevelopment());
}

const trustedServersListeners = new Set<() => void>();

/** Subscribe to changes of the servers added by the user (the application menu lists them). */
export function onTrustedServersChange(listener: () => void): () => void {
    trustedServersListeners.add(listener);
    return () => trustedServersListeners.delete(listener);
}

function emitTrustedServersChange(): void {
    for (const listener of trustedServersListeners) {
        try {
            listener();
        } catch {
            /* a broken listener must not stop the others */
        }
    }
}

/** The self-hosted servers the user added, most recent first. */
export function getTrustedServers(): string[] {
    return settings.get("trusted_origins") ?? [];
}

/**
 * Forget a server the user added. Pages already open on it stay as they are, but nothing on that
 * origin opens again (navigation, deep links, last room) until it is added back.
 */
export function removeTrustedServerOrigin(origin: string): void {
    settings.set("trusted_origins", removeTrustedServer(settings.get("trusted_origins"), origin));
    ElectronLog.info(`No longer trusting the server ${origin}, removed by the user.`);
    emitTrustedServersChange();
}

/** Remember a self-hosted server the user chose to add. Returns false if it cannot be added. */
export function trustServer(url: string): boolean {
    const origin = originUserMayTrust(url);
    if (!origin) {
        return false;
    }
    settings.set("trusted_origins", addTrustedServer(settings.get("trusted_origins"), origin));
    ElectronLog.info(`Trusting the server ${origin}, added by the user.`);
    emitTrustedServersChange();
    return isAllowedNavigationUrl(url, getDesktopConfig());
}

/**
 * Whether `url` may be loaded, asking the portal's admin when its origin is not already trusted.
 *
 * Loaded pages get the native API (screen capture sources, notifications, PiP), so the app only loads
 * origins it trusts: the built-in ones, and white-label worlds the admin of the portal (built in, over
 * HTTPS) confirms as worlds of its install. A confirmation is remembered for a limited time. Only called
 * for addresses the user chose to open (Landing, world switcher, deep link, a world navigating itself):
 * never for every outgoing link, which would send the admin each site the user visits.
 * A self-hosted server is unknown to that admin: the Landing then offers to add it by hand (trustServer).
 */
export async function ensureWorldOriginTrusted(url: string): Promise<boolean> {
    const config = getDesktopConfig();
    if (isAllowedNavigationUrl(url, config)) {
        return true;
    }
    const requestUrl = verifyOriginRequestUrl(config.portalUrl, url, isDevelopment());
    if (!requestUrl) {
        return false;
    }
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), VERIFY_TIMEOUT_MS);
    try {
        const response = await net.fetch(requestUrl, { signal: abort.signal });
        if (response.status !== 204) {
            return false;
        }
    } catch (error) {
        ElectronLog.warn("Could not ask the portal about a world origin.", error);
        return false;
    } finally {
        clearTimeout(timer);
    }
    const origin = new URL(url).origin;
    settings.set("verified_origins", rememberVerifiedOrigin(settings.get("verified_origins"), origin));
    ElectronLog.info(`Trusting the white-label world origin ${origin} (confirmed by the portal).`);
    // A white-label origin over http stays refused outside development (isAllowedNavigationUrl).
    return isAllowedNavigationUrl(url, getDesktopConfig());
}
