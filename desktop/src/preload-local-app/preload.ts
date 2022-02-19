import { contextBridge, ipcRenderer } from "electron";
import type { WorkAdventureLocalAppApi } from "./types";

const api: WorkAdventureLocalAppApi = {
    desktop: true,
    getServers: () => ipcRenderer.invoke("local-app:getServers"),
    selectServer: (serverId: string) => ipcRenderer.invoke("local-app:selectServer", serverId),
    addServer: (serverName: string, serverUrl: string) =>
        ipcRenderer.invoke("local-app:addServer", serverName, serverUrl),
};

contextBridge.exposeInMainWorld("WorkAdventureDesktopApi", api);
