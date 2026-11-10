import { promises as fs } from "fs";
import path from "path";
import { app } from "electron";
import ElectronLog from "electron-log";
import Settings from "electron-settings";
import type { DesktopWindowMode } from "@workadventure/desktop-api";
import type { CompanionPlacement } from "./companion-window-policy";
import {
    LEGACY_LOGIN_ITEM_NAME,
    LEGACY_USER_DATA_DIR,
    migrateLegacySettings,
    type MigratedSettings,
} from "./legacy-settings-policy";
import {
    createDesktopConfig,
    getDefaultPortalUrl,
    normalizePersistedLastRoomUrl,
    normalizePersistedPortalUrl,
    normalizePersistedWorldHistory,
} from "./desktop-url-policy";

export type SettingsData = {
    log_level: ElectronLog.LogLevel;
    /** Show the multi-tab strip at the top of the shell. Most users run single-tab, so it can be
     * turned off via the "Show tab bar" menu item. Defaults to on for backward compatibility. */
    tab_bar_enabled: boolean;
    portal_url: string;
    last_room_url?: string;
    world_history: string[];
    pinned_worlds: string[];
    /** Servers outside the built-in domains the user added from the Landing (origins). See origin-verification. */
    trusted_origins?: string[];
    shortcuts: Record<"mute_toggle" | "camera_toggle" | "companion_toggle", string>;
    /** Last size of the resizable companion panel and where it sat on its screen, restored on reopen. */
    companion_placement?: CompanionPlacement;
    /** Linux under Wayland: see window-mode-policy. Unset: "x11". */
    window_mode?: DesktopWindowMode;
    /** Set before restarting in X11 mode, cleared once that start gets going: still set, it failed. */
    x11_start_pending?: boolean;
};

let settings: SettingsData;

const defaultSettings: SettingsData = {
    log_level: "info",
    tab_bar_enabled: true,
    portal_url: process.env.WA_DESKTOP_PORTAL_URL || getDefaultPortalUrl(),
    world_history: [],
    pinned_worlds: [],
    shortcuts: {
        // Global (work while another app has focus) — that is the point: muting during a meeting
        // usually happens while the user is in some other window. Three-modifier chords are all but
        // unclaimed on macOS/Windows, so registering them OS-wide steals nothing well-known. Notably
        // NOT Cmd+Shift+A / Cmd+Shift+V (Zoom's combos): those are Finder's Go→Applications and
        // paste-as-plain-text in Chrome/Slack/VS Code, which a global grab would shadow everywhere.
        mute_toggle: "CommandOrControl+Alt+Shift+M",
        camera_toggle: "CommandOrControl+Alt+Shift+C",
        // Opt-in, unlike the two above: no default global accelerator; the tray "Companion panel"
        // item toggles it without a shortcut.
        companion_toggle: "",
    },
};

/**
 * Keep only the accelerators a user actually configured, so persisted blanks don't mask a new
 * default. Every install that ran a build before mic/camera had default bindings has
 * `mute_toggle: ""` on disk, and `""` is a present key — a plain spread would let it win over the
 * default forever and ship the feature to new profiles only. A blank can only mean "never set":
 * the shortcut-editing UI is unreachable in this shell, so nothing can deliberately clear one.
 */
function configuredShortcuts(persisted: Partial<SettingsData["shortcuts"]> | undefined) {
    const configured: Partial<SettingsData["shortcuts"]> = {};
    for (const [name, accelerator] of Object.entries(persisted || {})) {
        if (typeof accelerator === "string" && accelerator.length > 0) {
            configured[name as keyof SettingsData["shortcuts"]] = accelerator;
        }
    }
    return configured;
}

/** What a 1.x install left in its own userData folder, for the first launch of 2.0. */
async function readLegacySettings(): Promise<MigratedSettings> {
    const file = path.join(app.getPath("appData"), LEGACY_USER_DATA_DIR, "settings.json");
    let legacy: unknown;
    try {
        legacy = JSON.parse(await fs.readFile(file, "utf8"));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            ElectronLog.warn(`Could not read the 1.x settings in ${file}:`, error);
        }
        return {};
    }
    ElectronLog.info(`Migrating the 1.x settings from ${file}.`);
    // 1.x registered auto-launch under its own name, pointing at its own executable, which the 2.0
    // installer removed. init() has 2.0 registered under its name if the user kept it on.
    if (process.platform === "win32") {
        app.setLoginItemSettings({ openAtLogin: false, name: LEGACY_LOGIN_ITEM_NAME });
    }
    return migrateLegacySettings(legacy, createDesktopConfig());
}

/**
 * Loads the settings. True when start at login is to be turned on: on the first launch of a fresh
 * install, or of an update from 1.x that had it on (its default).
 */
async function init(): Promise<boolean> {
    let _settings = await Settings.get();
    let turnOnStartAtLogin = false;
    if (Object.keys(_settings).length === 0) {
        const { auto_launch_enabled, ...legacy } = await readLegacySettings();
        turnOnStartAtLogin = auto_launch_enabled !== false;
        _settings = { ...defaultSettings, ...legacy };
    }
    const persistedSettings = _settings as Partial<SettingsData>;
    const persistedWorldHistory = Array.isArray(persistedSettings.world_history) ? persistedSettings.world_history : [];
    const persistedPinnedWorlds = Array.isArray(persistedSettings.pinned_worlds) ? persistedSettings.pinned_worlds : [];
    settings = {
        ...defaultSettings,
        ...persistedSettings,
        shortcuts: {
            ...defaultSettings.shortcuts,
            ...configuredShortcuts(persistedSettings.shortcuts),
        },
    };
    settings.portal_url = normalizePersistedPortalUrl(process.env.WA_DESKTOP_PORTAL_URL || settings.portal_url);
    settings.last_room_url = normalizePersistedLastRoomUrl(settings.last_room_url);
    settings.world_history = normalizePersistedWorldHistory([settings.last_room_url, ...persistedWorldHistory]);
    // Pinned worlds are sanitized the same way; a modest cap keeps the sidebar/menus tidy.
    settings.pinned_worlds = normalizePersistedWorldHistory(persistedPinnedWorlds, 12);
    await Settings.set(settings);
    return turnOnStartAtLogin;
}

function get(): SettingsData;
function get<T extends keyof SettingsData>(key: T): SettingsData[T] | undefined;
function get<T extends keyof SettingsData>(key?: T): SettingsData | SettingsData[T] | undefined {
    if (settings === undefined) {
        throw new Error("Settings not initialized");
    }

    if (key === undefined) {
        return settings;
    }

    return settings?.[key];
}

function set(key: SettingsData): void;
function set<T extends keyof SettingsData>(key: T, value: SettingsData[T]): void;
function set<T extends keyof SettingsData>(key: T | SettingsData, value?: SettingsData[T]) {
    if (settings === undefined) {
        throw new Error("Settings not initialized");
    }

    if (typeof key === "string" && value !== undefined) {
        settings[key] = value;
    } else if (typeof key !== "string") {
        Object.assign(settings, key);
    }

    void Settings.set(settings);
}

/** Resolves once the settings are on disk: set() writes in the background. */
function flush(): Promise<void> {
    return Settings.set(settings);
}

export default {
    init,
    get,
    set,
    flush,
};
