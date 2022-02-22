import ElectronLog from "electron-log";
import Settings from "electron-settings";
import type { Server } from "./preload-local-app/types";

export type SettingsData = {
    log_level: ElectronLog.LogLevel;
    auto_launch_enabled: boolean;
    servers: Server[];
    shortcuts: Record<"mute_toggle" | "camera_toggle", string>;
};

let settings: SettingsData;

const defaultSettings: SettingsData = {
    log_level: "info",
    auto_launch_enabled: true,
    servers: [
        {
            _id: `${Date.now()}-1`,
            name: "WA Demo",
            url: "https://play.staging.workadventu.re/@/tcm/workadventure/wa-village",
        },
    ],
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
    settings = _settings as SettingsData;
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
