import type { GoToPageEvent } from "../Events/GoToPageEvent";
import type { OpenTabEvent } from "../Events/OpenTabEvent";
import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";
import type { OpenCoWebSiteEvent } from "../Events/OpenCoWebSiteEvent";
import type { LoadPageEvent } from "../Events/LoadPageEvent";

export class WorkadventureNavigationCommands extends IframeApiContribution<WorkadventureNavigationCommands> {
    callbacks = [];

    openTab(url: string): void {
        sendToWorkadventure({
            type: "openTab",
            data: {
                url,
            },
        });
    }

    goToPage(url: string): void {
        sendToWorkadventure({
            type: "goToPage",
            data: {
                url,
            },
        });
    }

    goToRoom(url: string): void {
        sendToWorkadventure({
            type: "loadPage",
            data: {
                url,
            },
        });
    }

    openCoWebSite(url: string, allowApi: boolean = false, allowPolicy: string = ""): void {
        sendToWorkadventure({
            type: "openCoWebSite",
            data: {
                url,
                allowApi,
                allowPolicy,
            },
        });
    }

    closeCoWebSite(): void {
        sendToWorkadventure({
            type: "closeCoWebSite",
            data: null,
        });
    }
}

export default new WorkadventureNavigationCommands();
