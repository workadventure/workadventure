import { contextBridge, ipcRenderer } from "electron";
import type { WorkAdventureSidebarApi } from "./types";

const api: WorkAdventureSidebarApi = {
  desktop: true,
  getServers: () => ipcRenderer.invoke("sidebar:getServers"),
  selectServer: (serverId: string) =>
    ipcRenderer.invoke("sidebar:selectServer", serverId),
  addServer: (serverName: string, serverUrl: string) =>
    ipcRenderer.invoke("sidebar:addServer", serverName, serverUrl),
};

contextBridge.exposeInMainWorld("WorkAdventureDesktopApi", api);
