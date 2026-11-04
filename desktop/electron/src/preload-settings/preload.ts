import { contextBridge, ipcRenderer } from "electron";
import type { DesktopNativeStrings } from "@workadventure/desktop-api";
import type { SettingsApi } from "../settings/api";

// The settings window only: main checks every call comes from it, showing the settings page.
const api: SettingsApi = {
    platform: process.platform,
    getStrings: () => ipcRenderer.sendSync("app:i18n:settings") as DesktopNativeStrings | null,
    getState: () => ipcRenderer.invoke("app:settings:get"),
    setStartAtLogin: (enabled) => ipcRenderer.invoke("app:settings:start-at-login", Boolean(enabled)),
    setTabBar: (enabled) => ipcRenderer.invoke("app:settings:tab-bar", Boolean(enabled)),
    setWindowMode: (mode) => ipcRenderer.invoke("app:settings:window-mode", mode),
    restart: () => ipcRenderer.send("app:settings:restart"),
    setShortcut: (name, accelerator) => ipcRenderer.invoke("app:settings:shortcut", name, accelerator),
    checkForUpdates: () => ipcRenderer.send("app:settings:check-updates"),
    openLogs: () => ipcRenderer.send("app:settings:open-logs"),
};

contextBridge.exposeInMainWorld("WASettings", api);
