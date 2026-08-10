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
    /** Show the multi-tab strip at the top of the shell. Most users run single-tab, so it can be
     * turned off via the "Show tab bar" menu item. Defaults to on for backward compatibility. */
    tab_bar_enabled: boolean;
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
    tab_bar_enabled: true,
    portal_url: process.env.WA_DESKTOP_PORTAL_URL || "http://admin.workadventure.localhost/",
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
            ...configuredShortcuts(persistedSettings.shortcuts),
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
