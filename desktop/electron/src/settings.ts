import ElectronLog from "electron-log";
import Settings from "electron-settings";
import { normalizePersistedLastRoomUrl, normalizePersistedPortalUrl } from "./desktop-url-policy";

export type SettingsData = {
    log_level: ElectronLog.LogLevel;
    auto_launch_enabled: boolean;
    portal_url: string;
    last_room_url?: string;
    shortcuts: Record<"mute_toggle" | "camera_toggle", string>;
};

let settings: SettingsData;

const defaultSettings: SettingsData = {
    log_level: "info",
    auto_launch_enabled: true,
    portal_url: process.env.WA_DESKTOP_PORTAL_URL || "http://admin.workadventure.localhost/",
    shortcuts: {
        mute_toggle: "",
        camera_toggle: "",
    },
};

async function init() {
    let _settings = await Settings.get();
    if (Object.keys(_settings).length === 0) {
        _settings = defaultSettings;
    }
    settings = {
        ...defaultSettings,
        ...(_settings as Partial<SettingsData>),
        shortcuts: {
            ...defaultSettings.shortcuts,
            ...((_settings as Partial<SettingsData>).shortcuts || {}),
        },
    };
    settings.portal_url = normalizePersistedPortalUrl(process.env.WA_DESKTOP_PORTAL_URL || settings.portal_url);
    settings.last_room_url = normalizePersistedLastRoomUrl(settings.last_room_url);
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
