import type { IpcRendererEvent } from "electron";

export type WorkAdventureDesktopApi = {
    desktop: boolean;
    isDevelopment: () => Promise<boolean>;
    notify: (txt: string) => void;
    onMutedKeyPress: (callback: (event: IpcRendererEvent) => void) => void;
};
