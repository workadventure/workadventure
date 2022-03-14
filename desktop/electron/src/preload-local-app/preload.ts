import { contextBridge, ipcRenderer } from "electron";
import type { WorkAdventureLocalAppApi } from "./types";

const api: WorkAdventureLocalAppApi = {
    desktop: true,
    isDevelopment: () => ipcRenderer.invoke("is-development"),
    getVersion: () => ipcRenderer.invoke("get-version"),
    showLocalApp: () => ipcRenderer.invoke("local-app:showLocalApp"),
    getServers: () => ipcRenderer.invoke("local-app:getServers"),
    selectServer: (serverId) => ipcRenderer.invoke("local-app:selectServer", serverId),
    addServer: (server) => ipcRenderer.invoke("local-app:addServer", server),
    removeServer: (serverId) => ipcRenderer.invoke("local-app:removeServer", serverId),
    reloadShortcuts: () => ipcRenderer.invoke("local-app:reloadShortcuts"),
    getSettings: () => ipcRenderer.invoke("local-app:getSettings"),
    saveSetting: (key, value) => ipcRenderer.invoke("local-app:saveSetting", key, value),
    setShortcutsEnabled: (enabled) => ipcRenderer.invoke("local-app:setShortcutsEnabled", enabled),
};

contextBridge.exposeInMainWorld("WAD", api);
