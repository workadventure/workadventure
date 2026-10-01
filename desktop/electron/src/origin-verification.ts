import { net } from "electron";
import ElectronLog from "electron-log";
import settings from "./settings";
import { createDesktopConfig, isAllowedNavigationUrl, type DesktopConfig } from "./desktop-url-policy";
import { activeVerifiedOrigins, rememberVerifiedOrigin, verifyOriginRequestUrl } from "./verified-origins-policy";

const VERIFY_TIMEOUT_MS = 5000;

/** The desktop config, including the white-label origins the portal confirmed and that have not expired. */
export function getDesktopConfig(): DesktopConfig {
    return createDesktopConfig({
        ...process.env,
        portalUrl: settings.get("portal_url"),
        verifiedOrigins: activeVerifiedOrigins(settings.get("verified_origins")),
    });
}

/**
 * Whether `url` may be loaded, asking the portal's admin when its origin is not already trusted.
 *
 * Loaded pages get the native API (screen capture sources, notifications, PiP), so the app only loads
 * origins it trusts: the built-in ones, and white-label worlds the admin of the portal (built in, over
 * HTTPS) confirms as worlds of its install. A confirmation is remembered for a limited time. Only called
 * for addresses the user chose to open (Landing, world switcher, deep link, a world navigating itself):
 * never for every outgoing link, which would send the admin each site the user visits.
 * ponytail: a self-hosted portal without the endpoint answers 404, so its white-label worlds still
 * need WA_DESKTOP_ALLOWED_ORIGINS.
 */
export async function ensureWorldOriginTrusted(url: string): Promise<boolean> {
    const config = getDesktopConfig();
    if (isAllowedNavigationUrl(url, config)) {
        return true;
    }
    const requestUrl = verifyOriginRequestUrl(config.portalUrl, url, process.env.NODE_ENV === "development");
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
