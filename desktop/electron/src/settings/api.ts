import type { DesktopNativeStrings, DesktopWindowMode, DesktopWindowModeState } from "@workadventure/desktop-api";
import type { ShortcutName } from "../shortcut-policy";

/** What preload-settings exposes to the settings page as window.WASettings, and only to it. */

export type SettingsShortcuts = {
    accelerators: Record<ShortcutName, string>;
    /** Taken by the OS or another app: registering them failed. */
    unavailable: ShortcutName[];
};

export type SettingsState = {
    /** "dev" when unpackaged. */
    version: string;
    startAtLogin: boolean;
    tabBar: boolean;
    /** Linux under Wayland only. */
    windowMode?: DesktopWindowModeState;
    shortcuts: SettingsShortcuts;
};

export type SettingsApi = {
    platform: string;
    getStrings: () => DesktopNativeStrings | null;
    getState: () => Promise<SettingsState | undefined>;
    /** Each setter resolves with the state the app ends up in. */
    setStartAtLogin: (enabled: boolean) => Promise<boolean>;
    setTabBar: (enabled: boolean) => Promise<boolean>;
    setWindowMode: (mode: DesktopWindowMode) => Promise<DesktopWindowModeState | undefined>;
    restart: () => void;
    /** "" clears the shortcut. */
    setShortcut: (name: ShortcutName, accelerator: string) => Promise<SettingsShortcuts | undefined>;
    checkForUpdates: () => void;
    openLogs: () => void;
};
