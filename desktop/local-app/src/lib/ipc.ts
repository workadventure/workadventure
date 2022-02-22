import type { WorkAdventureLocalAppApi, SettingsData, Server } from "@wa-preload-local-app";

export { WorkAdventureLocalAppApi, SettingsData, Server };
// TODO fix type
export const api = (window as any)?.WorkAdventureDesktopApi as WorkAdventureLocalAppApi;
