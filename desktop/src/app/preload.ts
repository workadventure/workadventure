import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("WorkAdventureDesktopApi", {
  desktop: true,
  notify: (txt: string) => ipcRenderer.send("app:notify", txt),
  onMutedKeyPress: (callback: (event: IpcRendererEvent) => void) =>
    ipcRenderer.on("app:on-muted-key-press", callback),
});
