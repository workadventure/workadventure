import { contextBridge, ipcRenderer } from "electron";
import type { PipCommand, PipSdp, PipState, WorkAdventurePipApi } from "./types";

function subscribe(channel: string, callback: (...args: unknown[]) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
}

const api: WorkAdventurePipApi = {
    onOffer: (callback) =>
        subscribe("app:pip:offer", (sdp) => callback(sdp as PipSdp)),
    onIce: (callback) =>
        subscribe("app:pip:ice-from-main", (candidate) => callback(candidate as RTCIceCandidateInit)),
    onClose: (callback) => subscribe("app:pip:close", () => callback()),
    onState: (callback) => subscribe("app:pip:state-to-pip", (state) => callback(state as PipState)),
    sendAnswer: (sdp) => ipcRenderer.send("app:pip:answer", sdp),
    sendIce: (candidate) => ipcRenderer.send("app:pip:ice-from-pip", candidate),
    sendCommand: (command: PipCommand) => ipcRenderer.send("app:pip:command-from-pip", command),
    requestSources: () => ipcRenderer.invoke("app:pip:request-sources"),
    requestClose: () => ipcRenderer.send("app:pip:request-close"),
    ready: () => ipcRenderer.send("app:pip:ready"),
};

contextBridge.exposeInMainWorld("WADPiP", api);
