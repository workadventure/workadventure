// The 1.x app (package name "workadventure-desktop", no productName) kept its settings in
// <appData>/workadventure-desktop/settings.json. 2.0 is named WorkAdventure, so Electron gives it
// another userData folder: without this, an updated install starts with an empty profile.

import { isAllowedNavigationUrl, normalizePersistedWorldHistory, type DesktopConfig } from "./desktop-url-policy";
import { addTrustedServer, trustableOrigin } from "./trusted-servers-policy";

export const LEGACY_USER_DATA_DIR = "workadventure-desktop";

// Electron's default AppUserModelId, "electron.app.<name>": 1.x never set one, so it is the name of
// the value 1.x wrote under HKCU\...\Run for auto-launch.
export const LEGACY_LOGIN_ITEM_NAME = "electron.app.workadventure-desktop";

// Seeded in every 1.x profile, not chosen by the user.
const LEGACY_DEFAULT_SERVER_URL = "https://play.staging.workadventu.re/@/tcm/workadventure/wa-village";

const MAX_PINNED_WORLDS = 12;

export type MigratedSettings = {
    pinned_worlds?: string[];
    trusted_origins?: string[];
    shortcuts?: Record<string, string>;
    auto_launch_enabled?: boolean;
};

function isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object";
}

/**
 * The 2.0 settings carried over from a 1.x settings.json: its servers become pinned worlds, the
 * self-hosted ones (not trusted by default) become servers the user added, and the shortcuts and
 * auto-launch choice are kept.
 */
export function migrateLegacySettings(legacy: unknown, config: DesktopConfig): MigratedSettings {
    if (!isObject(legacy)) {
        return {};
    }
    // Only the servers 2.0 can open: trusted by default, or self-hosted over HTTPS.
    const urls = (Array.isArray(legacy.servers) ? (legacy.servers as unknown[]) : [])
        .map((server) => (isObject(server) ? server.url : undefined))
        .filter((url): url is string => typeof url === "string" && url !== LEGACY_DEFAULT_SERVER_URL)
        .filter((url) => isAllowedNavigationUrl(url, config) || trustableOrigin(url));

    // The user added the self-hosted ones by hand in 1.x, like a server added from the 2.0 Landing.
    let trustedOrigins: string[] = [];
    for (const url of [...urls].reverse()) {
        const origin = isAllowedNavigationUrl(url, config) ? undefined : trustableOrigin(url);
        if (origin) {
            trustedOrigins = addTrustedServer(trustedOrigins, origin);
        }
    }

    const migrated: MigratedSettings = {
        pinned_worlds: normalizePersistedWorldHistory(urls, MAX_PINNED_WORLDS),
        trusted_origins: trustedOrigins,
    };
    if (isObject(legacy.shortcuts)) {
        migrated.shortcuts = legacy.shortcuts as Record<string, string>;
    }
    if (typeof legacy.auto_launch_enabled === "boolean") {
        migrated.auto_launch_enabled = legacy.auto_launch_enabled;
    }
    return migrated;
}
