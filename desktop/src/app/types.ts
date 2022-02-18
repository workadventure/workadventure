import type { IpcRendererEvent } from "electron";

export type WorkAdventureDesktopApi = {
  desktop: boolean;
  notify: (txt: string) => void;
  onMutedKeyPress: (callback: (event: IpcRendererEvent) => void) => void;
};
