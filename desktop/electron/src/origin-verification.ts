import { net } from "electron";
import ElectronLog from "electron-log";
import settings from "./settings";
import { createDesktopConfig, isAllowedNavigationUrl, type DesktopConfig } from "./desktop-url-policy";
import {
    addTrustedServer,
    isWorkAdventureServerInfo,
    removeTrustedServer,
    trustableOrigin,
} from "./trusted-servers-policy";

const SERVER_INFO_TIMEOUT_MS = 5000;

/** The desktop config, including the servers the user added. */
export function getDesktopConfig(): DesktopConfig {
    return createDesktopConfig({
        ...process.env,
        portalUrl: settings.get("portal_url"),
        trustedOrigins: settings.get("trusted_origins") ?? [],
    });
}

function isDevelopment(): boolean {
    return process.env.NODE_ENV === "development";
}

/** The origin the user could add for `url`, or undefined. */
function originUserMayTrust(url: string): string | undefined {
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
 * Whether `url` is on a WorkAdventure server the user may add: over https (http in development), with a
 * /server.json like WorkAdventure's. Loaded pages get the native API (screen capture sources, notifications,
 * camera and microphone without a prompt), so passing this only earns the Landing's "add this server?"
 * question: the user decides. Only asked for addresses the user chose to open (Landing, world switcher,
 * deep link), never for every outgoing link.
 */
export async function isWorkAdventureServer(url: string): Promise<boolean> {
    const origin = originUserMayTrust(url);
    if (!origin) {
        return false;
    }
    try {
        const response = await net.fetch(origin + "/server.json", {
            signal: AbortSignal.timeout(SERVER_INFO_TIMEOUT_MS),
        });
        return response.ok && isWorkAdventureServerInfo(await response.json());
    } catch (error) {
        ElectronLog.info(`${origin} did not answer like a WorkAdventure server.`, error);
        return false;
    }
}
