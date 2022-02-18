import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import type { WorkAdventureDesktopApi } from "./types";

const api: WorkAdventureDesktopApi = {
    desktop: true,
    notify: (txt: string) => ipcRenderer.send("app:notify", txt),
    onMutedKeyPress: (callback: (event: IpcRendererEvent) => void) =>
        ipcRenderer.on("app:on-muted-key-press", callback),
};

contextBridge.exposeInMainWorld("WorkAdventureDesktopApi", api);
