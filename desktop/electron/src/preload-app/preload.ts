import { contextBridge, ipcRenderer } from "electron";
import type {
    DesktopPipCommand,
    DesktopPipSdp,
    DesktopWindowState,
    WorkAdventureDesktopApi,
    WorkAdventureDesktopPipApi,
} from "./types";

function subscribe(channel: string, callback: (...args: unknown[]) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
}

const pipApi: WorkAdventureDesktopPipApi = {
    supported: true,
    open: () => ipcRenderer.invoke("app:pip:open"),
    close: () => ipcRenderer.invoke("app:pip:close"),
    sendOffer: (sdp) => ipcRenderer.send("app:pip:offer-from-main", sdp),
    sendIce: (candidate) => ipcRenderer.send("app:pip:ice-from-main-renderer", candidate),
    sendState: (state) => ipcRenderer.send("app:pip:state-from-main", state),
    onAnswer: (callback) =>
        subscribe("app:pip:answer-to-main", (sdp) => callback(sdp as DesktopPipSdp)),
    onIce: (callback) =>
        subscribe("app:pip:ice-to-main", (candidate) => callback(candidate as RTCIceCandidateInit)),
    onClosed: (callback) => subscribe("app:pip:closed", () => callback()),
    onRequestClose: (callback) => subscribe("app:pip:request-close-from-pip", () => callback()),
    onCommand: (callback) =>
        subscribe("app:pip:command-to-main", (command) => callback(command as DesktopPipCommand)),
};

const api: WorkAdventureDesktopApi = {
    desktop: true,
    isDevelopment: () => ipcRenderer.invoke("is-development"),
    getVersion: () => ipcRenderer.invoke("get-version"),
    notify: (txt) => ipcRenderer.send("app:notify", txt),
    onMuteToggle: (callback) => {
        ipcRenderer.on("app:on-mute-toggle", callback);
    },
    onCameraToggle: (callback) => {
        ipcRenderer.on("app:on-camera-toggle", callback);
    },
    getWindowState: () => ipcRenderer.invoke("app:getWindowState"),
    onWindowStateChange: (callback) => {
        const listener = (_event: Electron.IpcRendererEvent, state: DesktopWindowState) => callback(state);
        ipcRenderer.on("app:on-window-state-change", listener);
        return () => ipcRenderer.removeListener("app:on-window-state-change", listener);
    },
    getDesktopCapturerSources: (options) => ipcRenderer.invoke("app:getDesktopCapturerSources", options),
    pip: pipApi,
};

contextBridge.exposeInMainWorld("WAD", api);
