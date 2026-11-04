import path from "path";
import { app, BrowserWindow, ipcMain } from "electron";
import ElectronLog from "electron-log";
import { isSettingsPageUrl, settingsPageUrl } from "./landing-page";
import { nativeStrings } from "./i18n";
import settings from "./settings";
import { isStartAtLoginEnabled, setStartAtLogin } from "./auto-launch";
import { getWindowModeState, restartToApplyWindowMode, setWindowMode, windowModeAvailable } from "./window-mode";
import { getUnavailableShortcuts, saveShortcut } from "./shortcuts";
import { isSettableAccelerator, SHORTCUT_NAMES, type ShortcutName } from "./shortcut-policy";
import { setTabBarEnabled } from "./native-menu";
import { manualRequestUpdateCheck } from "./auto-updater";
import { openLog } from "./log";
import type { SettingsShortcuts, SettingsState } from "./settings/api";

/**
 * The desktop app's own settings, in a window of their own (one at a time): reachable from the tray, the
 * application menu and WorkAdventure's settings, and served by the app, so they work with any server.
 * The page is a local file with its own preload, and its IPC answers that window's page and nothing else.
 */

let settingsWindow: BrowserWindow | undefined;

export function openSettingsWindow(): void {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        if (settingsWindow.isMinimized()) settingsWindow.restore();
        settingsWindow.show();
        settingsWindow.focus();
        return;
    }
    const window = new BrowserWindow({
        width: 640,
        height: 760,
        minWidth: 420,
        minHeight: 360,
        show: false,
        backgroundColor: "#0c1626",
        icon: path.join(__dirname, "..", "assets", "icons", "logo.png"),
        webPreferences: {
            preload: path.resolve(__dirname, "preload-settings", "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
        },
    });
    settingsWindow = window;
    removeSettingsWindowMenu();
    // The page links nowhere: whatever tries to navigate or open a window is not the page's doing.
    window.webContents.on("will-navigate", (event) => event.preventDefault());
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.once("ready-to-show", () => window.show());
    window.on("closed", () => {
        if (settingsWindow === window) settingsWindow = undefined;
    });
    window.loadURL(settingsPageUrl.href).catch((error) => ElectronLog.error("Failed to load the settings page", error));
}

/**
 * Windows/Linux: no World menu (and its tab shortcuts, such as Ctrl+W) in this window. Each rebuild of
 * the application menu puts it back on every window, this one included, so native-menu calls this too.
 */
export function removeSettingsWindowMenu(): void {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.setMenu(null);
    }
}

function isFromSettingsWindow(event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent): boolean {
    return (
        settingsWindow !== undefined &&
        !settingsWindow.isDestroyed() &&
        event.sender === settingsWindow.webContents &&
        event.senderFrame?.parent === null &&
        isSettingsPageUrl(event.senderFrame.url)
    );
}

function shortcutsState(): SettingsShortcuts {
    return { accelerators: { ...settings.get().shortcuts }, unavailable: getUnavailableShortcuts() };
}

function settingsState(): SettingsState {
    return {
        version: app.isPackaged ? app.getVersion() : "dev",
        startAtLogin: isStartAtLoginEnabled(),
        tabBar: settings.get("tab_bar_enabled") !== false,
        windowMode: windowModeAvailable ? getWindowModeState() : undefined,
        shortcuts: shortcutsState(),
    };
}

export function registerSettingsWindowIpc(): void {
    // Synchronous IPC: returnValue must ALWAYS be set, otherwise the page stays blocked.
    ipcMain.on("app:i18n:settings", (event) => {
        event.returnValue = isFromSettingsWindow(event) ? nativeStrings("settings.") : null;
    });
    ipcMain.handle("app:settings:get", (event) => (isFromSettingsWindow(event) ? settingsState() : undefined));
    ipcMain.handle("app:settings:start-at-login", (event, enabled: unknown) => {
        if (!isFromSettingsWindow(event)) return false;
        setStartAtLogin(enabled === true);
        return isStartAtLoginEnabled();
    });
    ipcMain.handle("app:settings:tab-bar", (event, enabled: unknown) =>
        isFromSettingsWindow(event) ? setTabBarEnabled(enabled === true, settingsWindow) : false
    );
    ipcMain.handle("app:settings:window-mode", (event, mode: unknown) => {
        if (!isFromSettingsWindow(event) || !windowModeAvailable || (mode !== "x11" && mode !== "wayland")) {
            return undefined;
        }
        return setWindowMode(mode);
    });
    ipcMain.on("app:settings:restart", (event) => {
        if (isFromSettingsWindow(event)) restartToApplyWindowMode();
    });
    ipcMain.handle("app:settings:shortcut", (event, name: unknown, accelerator: unknown) => {
        if (
            !isFromSettingsWindow(event) ||
            !SHORTCUT_NAMES.includes(name as ShortcutName) ||
            typeof accelerator !== "string" ||
            (accelerator !== "" && !isSettableAccelerator(accelerator))
        ) {
            return undefined;
        }
        saveShortcut(name as ShortcutName, accelerator);
        return shortcutsState();
    });
    ipcMain.on("app:settings:check-updates", (event) => {
        if (isFromSettingsWindow(event)) void manualRequestUpdateCheck();
    });
    ipcMain.on("app:settings:open-logs", (event) => {
        if (isFromSettingsWindow(event)) void openLog();
    });
}
