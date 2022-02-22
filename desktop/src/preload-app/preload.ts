import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { SettingsData } from "src/settings";
import type { WorkAdventureDesktopApi } from "./types";

const api: WorkAdventureDesktopApi = {
    desktop: true,
    isDevelopment: () => ipcRenderer.invoke("is-development"),
    getVersion: () => ipcRenderer.invoke("get-version"),
    notify: (txt: string) => ipcRenderer.send("app:notify", txt),
    onMuteToggle: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on("app:on-mute-toggle", callback),
    onCameraToggle: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on("app:on-camera-toggle", callback),
};

contextBridge.exposeInMainWorld("WorkAdventureDesktopApi", api);
