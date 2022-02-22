import type { IpcRendererEvent } from "electron";

export type WorkAdventureDesktopApi = {
    desktop: boolean;
    isDevelopment: () => Promise<boolean>;
    getVersion: () => Promise<string>;
    notify: (txt: string) => void;
    onMuteToggle: (callback: (event: IpcRendererEvent) => void) => void;
    onCameraToggle: (callback: (event: IpcRendererEvent) => void) => void;
};
