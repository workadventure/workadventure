import ElectronLog from "electron-log";
import Settings from "electron-settings";
import type { Server } from "./preload-local-app/types";

type SettingsData = {
    log_level: ElectronLog.LogLevel;
    auto_launch_enabled: boolean;
    servers: Server[];
};

let settings: SettingsData;

async function init() {
    settings = (await Settings.get()) as SettingsData;
}

function get<T extends keyof SettingsData>(key: T, fallback?: SettingsData[T]): SettingsData[T] {
    if (settings === null) {
        throw new Error("Settings not initialized");
    }

    return settings?.[key];
}

export function set<T extends keyof SettingsData>(key: T, value: SettingsData[T]) {
    if (settings === null) {
        throw new Error("Settings not initialized");
    }

    settings[key] = value;
    void Settings.set(settings);
}

export default {
    init,
    get,
    set,
};
