import ElectronLog from "electron-log";
import Settings from "electron-settings";
import {
    normalizePersistedLastRoomUrl,
    normalizePersistedPortalUrl,
    normalizePersistedWorldHistory,
} from "./desktop-url-policy";

export type SettingsData = {
    log_level: ElectronLog.LogLevel;
    auto_launch_enabled: boolean;
    portal_url: string;
    last_room_url?: string;
    world_history: string[];
    pinned_worlds: string[];
    shortcuts: Record<"mute_toggle" | "camera_toggle" | "companion_toggle", string>;
    /** Last size + position of the resizable companion panel, restored (and clamped) on reopen. */
    companion_bounds?: { x: number; y: number; width: number; height: number };
};

let settings: SettingsData;

const defaultSettings: SettingsData = {
    log_level: "info",
    // Auto-launch is OPT-IN: silently adding WorkAdventure to OS startup is non-compliant with
    // macOS Sonoma+ background-item guidelines and Windows install best practices. Users explicitly
    // opt in via the preferences UI.
    auto_launch_enabled: false,
    portal_url: process.env.WA_DESKTOP_PORTAL_URL || "http://admin.workadventure.localhost/",
    world_history: [],
    pinned_worlds: [],
    shortcuts: {
        mute_toggle: "",
        camera_toggle: "",
        // Opt-in like the others: no default global accelerator (avoids OS-wide conflicts); the tray
        // "Companion panel" item toggles it without a shortcut.
        companion_toggle: "",
    },
};

async function init() {
    let _settings = await Settings.get();
    if (Object.keys(_settings).length === 0) {
        _settings = defaultSettings;
    }
    const persistedSettings = _settings as Partial<SettingsData>;
    const persistedWorldHistory = Array.isArray(persistedSettings.world_history) ? persistedSettings.world_history : [];
    const persistedPinnedWorlds = Array.isArray(persistedSettings.pinned_worlds) ? persistedSettings.pinned_worlds : [];
    settings = {
        ...defaultSettings,
        ...persistedSettings,
        shortcuts: {
            ...defaultSettings.shortcuts,
            ...(persistedSettings.shortcuts || {}),
        },
    };
    settings.portal_url = normalizePersistedPortalUrl(process.env.WA_DESKTOP_PORTAL_URL || settings.portal_url);
    settings.last_room_url = normalizePersistedLastRoomUrl(settings.last_room_url);
    settings.world_history = normalizePersistedWorldHistory([settings.last_room_url, ...persistedWorldHistory]);
    // Pinned worlds are sanitized the same way; a modest cap keeps the sidebar/menus tidy.
    settings.pinned_worlds = normalizePersistedWorldHistory(persistedPinnedWorlds, 12);
    await Settings.set(settings);
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

export default {
    init,
    get,
    set,
};
