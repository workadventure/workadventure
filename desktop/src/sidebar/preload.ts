import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("WorkAdventureDesktopApi", {
  desktop: true,
  getServers: () => ipcRenderer.invoke("sidebar:getServers"),
  selectServer: (serverId: string) =>
    ipcRenderer.invoke("sidebar:selectServer", serverId),
  addServer: (serverName: string, serverUrl: string) =>
    ipcRenderer.invoke("sidebar:addServer", serverName, serverUrl),
});
