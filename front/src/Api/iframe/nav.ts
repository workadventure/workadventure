import { IframeApiContribution, sendToWorkadventure, queryWorkadventure } from "./IframeApiContribution";

export class CoWebsite {
    constructor(private readonly id: string, public readonly position: number) {}

    close() {
        return queryWorkadventure({
            type: "closeCoWebsite",
            data: this.id,
        });
    }
}

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

    async openCoWebSite(url: string, allowApi?: boolean, allowPolicy?: string, position?: number): Promise<CoWebsite> {
        const result = await queryWorkadventure({
            type: "openCoWebsite",
            data: {
                url,
                allowApi,
                allowPolicy,
                position,
            },
        });
        return new CoWebsite(result.id, result.position);
    }

    async getCoWebSites(): Promise<CoWebsite[]> {
        const result = await queryWorkadventure({
            type: "getCoWebsites",
            data: undefined
        });
        return result.map((cowebsiteEvent) => new CoWebsite(cowebsiteEvent.id, cowebsiteEvent.position));
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
}

export default new WorkadventureNavigationCommands();
