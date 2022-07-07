import { contextBridge, ipcRenderer } from "electron";
import type { WorkAdventureDesktopApi } from "./types";

const api: WorkAdventureDesktopApi = {
    desktop: true,
    isDevelopment: () => ipcRenderer.invoke("is-development"),
    getVersion: () => ipcRenderer.invoke("get-version"),
    notify: (txt) => ipcRenderer.send("app:notify", txt),
    onMuteToggle: (callback) => ipcRenderer.on("app:on-mute-toggle", callback),
    onCameraToggle: (callback) => ipcRenderer.on("app:on-camera-toggle", callback),
    getDesktopCapturerSources: (options) => ipcRenderer.invoke("app:getDesktopCapturerSources", options),
};

contextBridge.exposeInMainWorld("WAD", api);
