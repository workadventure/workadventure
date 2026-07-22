import { contextBridge, ipcRenderer } from "electron";
import type {
    DesktopOverlayDrawOp,
    DesktopPipCommand,
    DesktopPipSdp,
    DesktopWindowState,
    WorkAdventureDesktopApi,
    WorkAdventureDesktopHudApi,
    WorkAdventureDesktopOverlayApi,
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
    onAnswer: (callback) => subscribe("app:pip:answer-to-main", (sdp) => callback(sdp as DesktopPipSdp)),
    onIce: (callback) => subscribe("app:pip:ice-to-main", (candidate) => callback(candidate as RTCIceCandidateInit)),
    onClosed: (callback) => subscribe("app:pip:closed", () => callback()),
    onRequestClose: (callback) => subscribe("app:pip:request-close-from-pip", () => callback()),
    onCommand: (callback) => subscribe("app:pip:command-to-main", (command) => callback(command as DesktopPipCommand)),
};

const screenOverlayApi: WorkAdventureDesktopOverlayApi = {
    open: (opts) => ipcRenderer.invoke("app:overlay:open", opts),
    close: () => ipcRenderer.invoke("app:overlay:close"),
    setDrawMode: (enabled) => ipcRenderer.send("app:overlay:set-draw-mode", enabled),
    setTool: (tool) => ipcRenderer.send("app:overlay:set-tool", tool),
    pushElements: (elements) => ipcRenderer.send("app:overlay:set-elements", elements),
    onDraw: (callback) => subscribe("app:overlay:draw-to-main", (op) => callback(op as DesktopOverlayDrawOp)),
    onExit: (callback) => subscribe("app:overlay:exit-to-main", () => callback()),
};

const presenterHudApi: WorkAdventureDesktopHudApi = {
    openMeetingBar: (opts) => ipcRenderer.invoke("app:hud:open-meeting-bar", opts),
    closeMeetingBar: () => ipcRenderer.invoke("app:hud:close-meeting-bar"),
    openAnnotationBar: (opts) => ipcRenderer.invoke("app:hud:open-annotation-bar", opts),
    closeAnnotationBar: () => ipcRenderer.invoke("app:hud:close-annotation-bar"),
    pushState: (state) => ipcRenderer.send("app:hud:state-from-main", state),
    onCommand: (callback) => subscribe("app:hud:command-to-main", (command) => callback(command as DesktopPipCommand)),
};

const api: WorkAdventureDesktopApi = {
    desktop: true,
    isDevelopment: () => ipcRenderer.invoke("is-development"),
    getVersion: () => ipcRenderer.invoke("get-version"),
    notify: (payload) => ipcRenderer.send("app:notify", payload),
    onNotificationClick: (callback) =>
        subscribe("app:on-notification-click", (tag) => callback(typeof tag === "string" ? tag : undefined)),
    setKeepAwake: (enabled) => ipcRenderer.send("app:setKeepAwake", Boolean(enabled)),
    setUnreadCount: (count) => ipcRenderer.send("app:setUnreadCount", Number(count) || 0),
    setPresence: (presence) => ipcRenderer.send("app:setPresence", presence),
    onSystemIdle: (callback) => subscribe("app:on-system-idle", (idle) => callback(Boolean(idle))),
    presenter: {
        setTool: (tool, displayId) => ipcRenderer.send("app:presenter:setTool", { tool, displayId }),
        onCursor: (callback) =>
            subscribe("app:on-presenter-cursor", (point) => {
                const p = (point && typeof point === "object" ? point : {}) as { x?: unknown; y?: unknown };
                callback(Number(p.x) || 0, Number(p.y) || 0);
            }),
    },
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
    navigation: {
        joinWorld: (url: string) => ipcRenderer.invoke("app:navigation:joinWorld", url),
        getRecentWorlds: () => ipcRenderer.invoke("app:navigation:getRecentWorlds"),
        openAdminSignup: () => ipcRenderer.invoke("app:navigation:openAdminSignup"),
    },
    screenOverlay: screenOverlayApi,
    presenterHud: presenterHudApi,
};

contextBridge.exposeInMainWorld("WAD", api);
