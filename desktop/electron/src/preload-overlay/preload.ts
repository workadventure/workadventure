import { contextBridge, ipcRenderer } from "electron";
import type {
    OverlayDrawOp,
    OverlayElement,
    OverlayPresenterEffect,
    OverlayToolState,
    WorkAdventureOverlayApi,
} from "./types";

function subscribe(channel: string, callback: (...args: unknown[]) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
}

const api: WorkAdventureOverlayApi = {
    onElements: (callback) => subscribe("app:overlay:elements", (elements) => callback(elements as OverlayElement[])),
    onDrawMode: (callback) => subscribe("app:overlay:draw-mode", (enabled) => callback(enabled as boolean)),
    onTool: (callback) => subscribe("app:overlay:tool", (tool) => callback(tool as OverlayToolState)),
    onPresenterEffect: (callback) =>
        subscribe("app:overlay:presenter-effect", (effect) => callback(effect as OverlayPresenterEffect)),
    emitDraw: (op: OverlayDrawOp) => ipcRenderer.send("app:overlay:draw-from-overlay", op),
    requestExit: () => ipcRenderer.send("app:overlay:request-exit"),
    ready: () => ipcRenderer.send("app:overlay:ready"),
};

contextBridge.exposeInMainWorld("WAOverlay", api);
