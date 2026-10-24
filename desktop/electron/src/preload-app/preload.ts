import { contextBridge, ipcRenderer } from "electron";
import { canHideWindowsFromCapture, usesSystemScreenSharePicker } from "../platform-capture-policy";
import { companionVisibleInShare } from "../share-surfaces-policy";
import type { DesktopNativeStrings, WorkAdventureDesktopApi, WorkAdventureDesktopWindowsApi } from "./types";

function subscribe(channel: string, callback: (...args: unknown[]) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
}

const windowsApi: WorkAdventureDesktopWindowsApi = {
    onOpen: (callback) =>
        subscribe("app:windows:open", (kind) => {
            if (kind === "companion" || kind === "meeting-bar") callback(kind);
        }),
    onMeetingWanted: (callback) => subscribe("app:windows:meeting-wanted", (wanted) => callback(wanted === true)),
    toggleCompanion: () => ipcRenderer.send("app:windows:toggle-companion"),
    openCompanion: () => ipcRenderer.send("app:windows:open-companion"),
    dismissCompanion: () => ipcRenderer.send("app:windows:dismiss-companion"),
    focusMain: () => ipcRenderer.send("app:windows:focus-main"),
    visibleInShare: (sharing) => companionVisibleInShare(canHideWindowsFromCapture(process.platform), sharing),
    tabStripShown: () => ipcRenderer.invoke("app:windows:tab-strip-shown"),
    toggleTabStrip: () => ipcRenderer.send("app:windows:toggle-tab-strip"),
};

// Lets the companion open when the window gets fully covered or minimized (see onPageVisibilityChange).
document.addEventListener("visibilitychange", () => {
    ipcRenderer.send("app:page-visibility", document.visibilityState === "hidden");
});

// A tab shows the native Landing (a local file) or a world (a remote page); the preload runs for each.
const onNativeLanding = location.protocol === "file:";

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
        subscribe("app:on-other-meeting-muted", (worldName) => callback(String(worldName ?? ""))),
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
};

contextBridge.exposeInMainWorld("WAD", api);
