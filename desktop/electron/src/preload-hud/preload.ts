import { contextBridge, ipcRenderer } from "electron";
import type { HudCommand, HudState, WorkAdventureHudApi } from "./types";

function subscribe(channel: string, callback: (...args: unknown[]) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
}

const api: WorkAdventureHudApi = {
    onState: (callback) => subscribe("app:hud:state", (state) => callback(state as HudState)),
    sendCommand: (command: HudCommand) => ipcRenderer.send("app:hud:command-from-hud", command),
    requestSources: () => ipcRenderer.invoke("app:hud:request-sources"),
    setExpanded: (expanded) => ipcRenderer.send("app:hud:set-expanded", expanded === true),
    ready: () => ipcRenderer.send("app:hud:ready"),
};

contextBridge.exposeInMainWorld("WAHud", api);
