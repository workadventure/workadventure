import ElectronLog from "electron-log";
import Settings from "electron-settings";
import type { Server } from "./preload-local-app/types";

export type SettingsData = {
    log_level: ElectronLog.LogLevel;
    auto_launch_enabled: boolean;
    servers: Server[];
    shortcuts: Record<"mute_toggle" | "camera_toggle", string | null>;
};

let settings: SettingsData;

async function init() {
    settings = (await Settings.get()) as SettingsData;
}

function get<T extends keyof SettingsData>(key: T): SettingsData[T] | undefined {
    if (settings === undefined) {
        throw new Error("Settings not initialized");
    }

    return settings?.[key];
}

export function set<T extends keyof SettingsData>(key: T, value: SettingsData[T]) {
    if (settings === undefined) {
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
