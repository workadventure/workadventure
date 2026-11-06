import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("WAScreenPick", {
    pick: () => ipcRenderer.send("app:screen-identify:pick"),
    cancel: () => ipcRenderer.send("app:screen-identify:cancel"),
});
