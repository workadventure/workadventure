import { contextBridge, ipcRenderer } from "electron";
import type { DesktopWindowState, WorkAdventureDesktopApi } from "./types";

const api: WorkAdventureDesktopApi = {
    desktop: true,
    isDevelopment: () => ipcRenderer.invoke("is-development"),
    getVersion: () => ipcRenderer.invoke("get-version"),
    notify: (txt) => ipcRenderer.send("app:notify", txt),
    onMuteToggle: (callback) => {
        ipcRenderer.on("app:on-mute-toggle", callback);
    },
    onCameraToggle: (callback) => {
        ipcRenderer.on("app:on-camera-toggle", callback);
    },
    getWindowState: () => ipcRenderer.invoke("app:getWindowState"),
    onWindowStateChange: (callback) => {
        const listener = (_event: Electron.IpcRendererEvent, state: DesktopWindowState) => callback(state);
        ipcRenderer.on("app:on-window-state-change", listener);
        return () => ipcRenderer.removeListener("app:on-window-state-change", listener);
    },
    getDesktopCapturerSources: (options) => ipcRenderer.invoke("app:getDesktopCapturerSources", options),
};

contextBridge.exposeInMainWorld("WAD", api);
