// copy of Electron.SourcesOptions to avoid Electron dependency in front
import {ipcRenderer} from "electron";

export type WorkAdventureOverlayDesktopApi = {
    onWebRtcReceived: (callback: (message: any) => void) => void;
    onEventReceivedFromApp: (callback: (message: any) => void) => void;
};
