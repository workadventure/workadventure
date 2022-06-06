import { contextBridge, ipcRenderer } from "electron";
import type { WorkAdventureDesktopApi } from "./types";

let port!: MessagePort;

const api: WorkAdventureDesktopApi = {
    desktop: true,
    isDevelopment: () => ipcRenderer.invoke("is-development"),
    getVersion: () => ipcRenderer.invoke("get-version"),
    notify: (txt) => ipcRenderer.send("app:notify", txt),
    onMuteToggle: (callback) => ipcRenderer.on("app:on-mute-toggle", callback),
    onCameraToggle: (callback) => ipcRenderer.on("app:on-camera-toggle", callback),
    getDesktopCapturerSources: (options) => ipcRenderer.invoke("app:getDesktopCapturerSources", options),
    // We use postMessage to be able to pass a MessagePort in the future (with the video inside if we are lucky!)
    webRtcReceived: (name: string) => ipcRenderer.postMessage("webRtcReceived", { message: 'hello', name }),
    connectToOverlay: () => {
        const channel = new MessageChannel();
        port = channel.port1;
        ipcRenderer.postMessage("connectToOverlay", null, [ channel.port2 ])
    },
    streamVideo: (mediaStream: MediaStream) => {
        // @ts-ignore
        port.postMessage(null, [ mediaStream ]);
    }
};

contextBridge.exposeInMainWorld("WAD", api);
