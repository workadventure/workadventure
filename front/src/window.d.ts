import { WorkAdventureApi } from "./iframe_api";
import { WorkAdventureDesktopApi } from "@wa-preload-app";

declare global {
    interface Window {
        WA: WorkAdventureApi;
        WAD: WorkAdventureDesktopApi;
    }
    let WA: WorkAdventureApi;
}
