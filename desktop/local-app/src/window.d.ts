import type { WorkAdventureLocalAppApi } from "@wa-preload-local-app";

declare global {
    interface Window {
        WAD: WorkAdventureLocalAppApi;
    }
}
