import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("WorkAdventureDesktopApi", {
  desktop: true,
  notify: (txt: string) => ipcRenderer.send("notify", txt),
  onMutedKeyPress: (callback: (event: IpcRendererEvent) => void) =>
    ipcRenderer.on("on-muted-key-press", callback),
});
