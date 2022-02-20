import { contextBridge, ipcRenderer } from "electron";
import type { Server, WorkAdventureLocalAppApi } from "./types";

const api: WorkAdventureLocalAppApi = {
    desktop: true,
    isDevelopment: () => ipcRenderer.invoke("is-development"),
    showLocalApp: () => ipcRenderer.invoke("local-app:showLocalApp"),
    getServers: () => ipcRenderer.invoke("local-app:getServers"),
    selectServer: (serverId: string) => ipcRenderer.invoke("local-app:selectServer", serverId),
    addServer: (server: Omit<Server, "_id">) => ipcRenderer.invoke("local-app:addServer", server),
    removeServer: (serverId: Server["_id"]) => ipcRenderer.invoke("local-app:removeServer", serverId),
};

contextBridge.exposeInMainWorld("WorkAdventureDesktopApi", api);
