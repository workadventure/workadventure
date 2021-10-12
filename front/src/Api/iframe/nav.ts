import { IframeApiContribution, sendToWorkadventure, queryWorkadventure } from "./IframeApiContribution";

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

    /**
     * @deprecated Use openCoWebsite instead
     */
    openCoWebSite(url: string, allowApi?: boolean, allowPolicy?: string) {
        return queryWorkadventure({
            type: "openCoWebsite",
            data: {
                url,
                allowApi,
                allowPolicy,
                position: undefined,
            },
        });
    }

    openCoWebsite(url: string, allowApi?: boolean, allowPolicy?: string, position?: number) {
        return queryWorkadventure({
            type: "openCoWebsite",
            data: {
                url,
                allowApi,
                allowPolicy,
                position,
            },
        });
    }

    getCoWebsites() {
        return queryWorkadventure({
            type: "getCoWebsites",
            data: undefined
        });
    }

    /**
     * @deprecated Use closeCoWebsites instead to close all co-websites
     */
    closeCoWebSite() {
        return queryWorkadventure({
            type: "closeCoWebsites",
            data: undefined,
        });
    }

    closeCoWebsite(coWebsiteId: string) {
        return queryWorkadventure({
            type: "closeCoWebsite",
            data: coWebsiteId,
        });
    }

    closeCoWebsites() {
        return queryWorkadventure({
            type: "closeCoWebsites",
            data: undefined,
        });
    }
}

export default new WorkadventureNavigationCommands();
