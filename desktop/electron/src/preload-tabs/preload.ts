import { contextBridge, ipcRenderer } from "electron";
import type { TabInfo, WorkAdventureTabsApi } from "./types";

function subscribe(channel: string, callback: (...args: unknown[]) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
}

const api: WorkAdventureTabsApi = {
    onTabs: (callback) => subscribe("app:tabs:list", (tabs) => callback((tabs as TabInfo[]) ?? [])),
    newTab: () => ipcRenderer.send("app:tabs:new"),
    activate: (id) => ipcRenderer.send("app:tabs:activate", id),
    close: (id) => ipcRenderer.send("app:tabs:close", id),
    ready: () => ipcRenderer.send("app:tabs:ready"),
};

contextBridge.exposeInMainWorld("WATabs", api);
