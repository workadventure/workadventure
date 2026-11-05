import { contextBridge, ipcRenderer } from "electron";
import { canHideWindowsFromCapture, usesSystemScreenSharePicker } from "../platform-capture-policy";
import { miniWindowVisibleInShare } from "../share-surfaces-policy";
import { windowModeApplies } from "../window-mode-policy";
import type {
    DesktopNativeStrings,
    WorkAdventureDesktopApi,
    WorkAdventureDesktopWindowsApi,
} from "@workadventure/desktop-api";

function subscribe(channel: string, callback: (...args: unknown[]) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
}

const windowsApi: WorkAdventureDesktopWindowsApi = {
    ...(canHideWindowsFromCapture(process.platform)
        ? {
              setAnnotationState: (
                  state: Parameters<NonNullable<WorkAdventureDesktopWindowsApi["setAnnotationState"]>>[0]
              ) => ipcRenderer.send("app:windows:annotation-state", state),
              onAnnotationCursor: (callback: (x: number, y: number) => void) =>
                  subscribe("app:windows:annotation-cursor", (x, y) => {
                      if (typeof x === "number" && typeof y === "number") callback(x, y);
                  }),
          }
        : {}),
    onOpen: (callback) =>
        subscribe("app:windows:open", (kind) => {
            if (kind === "mini-window" || kind === "meeting-bar" || kind === "annotation") callback(kind);
        }),
    onMeetingWanted: (callback) => subscribe("app:windows:meeting-wanted", (wanted) => callback(wanted === true)),
    toggleMiniWindow: () => ipcRenderer.send("app:windows:toggle-mini-window"),
    openMiniWindow: () => ipcRenderer.send("app:windows:open-mini-window"),
    dismissMiniWindow: () => ipcRenderer.send("app:windows:dismiss-mini-window"),
    focusMain: () => ipcRenderer.send("app:windows:focus-main"),
    visibleInShare: (sharing) => miniWindowVisibleInShare(canHideWindowsFromCapture(process.platform), sharing),
    tabStripShown: () => ipcRenderer.invoke("app:windows:tab-strip-shown"),
    toggleTabStrip: () => ipcRenderer.send("app:windows:toggle-tab-strip"),
};

// Lets the mini window open when the window gets fully covered or minimized (see onPageVisibilityChange).
document.addEventListener("visibilitychange", () => {
    ipcRenderer.send("app:page-visibility", document.visibilityState === "hidden");
});

// A tab shows the native Landing (a local file, or electron-vite's dev server while developing) or a
// world (a remote page); the preload runs for each. Main checks the sender again, dev server included.
const devServerUrl = process.env.ELECTRON_RENDERER_URL;
const onNativeLanding =
    location.protocol === "file:" || (devServerUrl !== undefined && location.origin === new URL(devServerUrl).origin);

const api: WorkAdventureDesktopApi = {
    desktop: true,
    hello: (page) => ipcRenderer.sendSync("app:hello", page) as { contract: number } | null,
    isDevelopment: () => ipcRenderer.invoke("is-development"),
    getVersion: () => ipcRenderer.invoke("get-version"),
    notify: (text) => ipcRenderer.send("app:notify", String(text)),
    notifyMessage: (payload) => ipcRenderer.send("app:notify", payload),
    onNotificationClick: (callback) =>
        subscribe("app:on-notification-click", (tag) => callback(typeof tag === "string" ? tag : undefined)),
    setKeepAwake: (enabled) => ipcRenderer.send("app:setKeepAwake", Boolean(enabled)),
    setUnreadCount: (count) => ipcRenderer.send("app:setUnreadCount", Number(count) || 0),
    setPresence: (presence) => ipcRenderer.send("app:setPresence", presence),
    setScreenShareSource: (source) => ipcRenderer.send("app:screen-share-source", source),
    setTabTitle: (title) => ipcRenderer.send("app:setTabTitle", String(title ?? "")),
    onSystemIdle: (callback) => subscribe("app:on-system-idle", (idle) => callback(Boolean(idle))),
    onMediaPreempted: (callback) => subscribe("app:on-media-preempted", () => callback()),
    onOtherMeetingMuted: (callback) =>
        subscribe("app:on-other-meeting-muted", (worldName) =>
            callback(typeof worldName === "string" ? worldName : "")
        ),
    onMuteToggle: (callback) => {
        ipcRenderer.on("app:on-mute-toggle", callback);
    },
    onCameraToggle: (callback) => {
        ipcRenderer.on("app:on-camera-toggle", callback);
    },
    onRequestPresence: (callback) => {
        const listener = () => callback();
        ipcRenderer.on("app:request-presence", listener);
        return () => ipcRenderer.removeListener("app:request-presence", listener);
    },
    // Under Wayland the system share dialog is the picker: without these, the front shares through
    // getDisplayMedia, which the main process answers with that dialog (see configureSession).
    ...(usesSystemScreenSharePicker(process.platform, process.env)
        ? {}
        : {
              getDesktopCapturerSources: (
                  options: Parameters<NonNullable<WorkAdventureDesktopApi["getDesktopCapturerSources"]>>[0]
              ) => ipcRenderer.invoke("app:getDesktopCapturerSources", options),
              identifyScreens: () => ipcRenderer.invoke("app:screen-identify:start"),
              cancelIdentifyScreens: () => ipcRenderer.send("app:screen-identify:cancel"),
          }),
    navigation: {
        joinWorld: (url: string) => ipcRenderer.invoke("app:navigation:joinWorld", url),
        openAdminSignup: () => ipcRenderer.invoke("app:navigation:openAdminSignup"),
        // The rest only serves the native Landing (main checks it too): world pages never see it.
        ...(onNativeLanding
            ? {
                  trustServerAndJoin: (url: string) => ipcRenderer.invoke("app:navigation:trustServerAndJoin", url),
                  findWorlds: (email: string) => ipcRenderer.invoke("app:navigation:findWorlds", email),
                  signInToWorld: (url: string) => ipcRenderer.invoke("app:navigation:signInToWorld", url),
                  getRecentWorlds: () => ipcRenderer.invoke("app:navigation:getRecentWorlds"),
                  getPinnedWorlds: () => ipcRenderer.invoke("app:navigation:getPinnedWorlds"),
                  togglePin: (url: string) => ipcRenderer.invoke("app:navigation:togglePin", url),
                  isPinned: (url: string) => ipcRenderer.invoke("app:navigation:isPinned", url),
                  getStrings: () => ipcRenderer.sendSync("app:i18n:landing") as DesktopNativeStrings | null,
              }
            : {}),
    },
    windows: windowsApi,
    screenPermission: {
        get: () => ipcRenderer.invoke("app:screen-permission:get"),
        request: () => ipcRenderer.invoke("app:screen-permission:request"),
        ensure: () => ipcRenderer.invoke("app:screen-permission:ensure"),
    },
    startAtLogin: {
        get: () => ipcRenderer.invoke("app:start-at-login:get"),
        set: (enabled) => ipcRenderer.invoke("app:start-at-login:set", Boolean(enabled)),
    },
    openSettings: () => ipcRenderer.send("app:settings:open"),
    openLanding: () => ipcRenderer.send("app:landing:open"),
    ...(windowModeApplies(process.platform, process.env)
        ? {
              windowMode: {
                  get: () => ipcRenderer.invoke("app:window-mode:get"),
                  set: (mode) => ipcRenderer.invoke("app:window-mode:set", mode),
                  restart: () => ipcRenderer.send("app:window-mode:restart"),
              },
          }
        : {}),
};

contextBridge.exposeInMainWorld("WAD", api);
