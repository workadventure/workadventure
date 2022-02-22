import { contextBridge, ipcRenderer } from "electron";
import { SettingsData } from "src/settings";
import type { Server, WorkAdventureLocalAppApi } from "./types";

const api: WorkAdventureLocalAppApi = {
    desktop: true,
    isDevelopment: () => ipcRenderer.invoke("is-development"),
    getVersion: () => ipcRenderer.invoke("get-version"),
    showLocalApp: () => ipcRenderer.invoke("local-app:showLocalApp"),
    getServers: () => ipcRenderer.invoke("local-app:getServers"),
    selectServer: (serverId: string) => ipcRenderer.invoke("local-app:selectServer", serverId),
    addServer: (server: Omit<Server, "_id">) => ipcRenderer.invoke("local-app:addServer", server),
    removeServer: (serverId: Server["_id"]) => ipcRenderer.invoke("local-app:removeServer", serverId),
    saveShortcut: (shortcut: keyof SettingsData["shortcuts"], key: string | null) =>
        ipcRenderer.invoke("local-app:saveShortcut", shortcut, key),
    getShortcuts: () => ipcRenderer.invoke("local-app:getShortcuts"),
};

contextBridge.exposeInMainWorld("WorkAdventureDesktopApi", api);
