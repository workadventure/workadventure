import { IframeApiContribution, sendToWorkadventure, queryWorkadventure } from "./IframeApiContribution";

export class CoWebsite {
    constructor(private readonly id: string) {}

    close() {
        return queryWorkadventure({
            type: "closeCoWebsite",
            data: this.id,
        });
    }
}

export class WorkadventureNavigationCommands extends IframeApiContribution<WorkadventureNavigationCommands> {
    callbacks = [];

    /**
     * Opens the webpage at "url" in your browser, in a new tab.
     * {@link https://docs.workadventu.re/map-building/api-nav.md#opening-a-web-page-in-a-new-tab | Website documentation}
     *
     * @param {string} url Url of the web page
     */
    openTab(url: string): void {
        sendToWorkadventure({
            type: "openTab",
            data: {
                url,
            },
        });
    }

    /**
     * Opens the webpage at "url" in your browser in place of WorkAdventure. WorkAdventure will be completely unloaded.
     * {@link https://docs.workadventu.re/map-building/api-nav.md#opening-a-web-page-in-the-current-tab | Website documentation}
     *
     * @param {string} url Url of the web page
     */
    goToPage(url: string): void {
        sendToWorkadventure({
            type: "goToPage",
            data: {
                url,
            },
        });
    }

    /**
     * Load the map at url without unloading workadventure.
     * relative urls: "../subFolder/map.json[#start-layer-name]" global urls: "/_/global/domain/path/map.json[#start-layer-name]"
     * {@link https://docs.workadventu.re/map-building/api-nav.md#going-to-a-different-map-from-the-script | Website documentation}
     *
     * @param {string} url Url of the web page
     */
    goToRoom(url: string): void {
        sendToWorkadventure({
            type: "loadPage",
            data: {
                url,
            },
        });
    }

    /**
     * Opens the webpage at "url" in an iFrame (on the right side of the screen) or close that iFrame.
     * {@link https://docs.workadventu.re/map-building/api-nav.md#openingclosing-web-page-in-co-websites | Website documentation}
     *
     * @param {string} url Url of the web page
     * @param {boolean|undefined} allowApi  Allows the webpage to use the "IFrame API" and execute script (it is equivalent to putting the openWebsiteAllowApi property in the map)
     * @param {string|undefined} allowPolicy Grants additional access rights to the iFrame
     * @param {number|undefined} widthPercent Define the width of the main cowebsite beetween the min size and the max size (70% of the viewport)
     * @param {number|undefined} position Define in whitch slot the web page will be open
     * @param {boolean|undefined} closable Allow to close the webpage also you need to close it by the api
     * @param {boolean|undefined} lazy Add the cowebsite but don't load it
     * @returns {CoWebsite} The CoWebsite created
     */
    async openCoWebSite(
        url: string,
        allowApi?: boolean,
        allowPolicy?: string,
        widthPercent?: number,
        position?: number,
        closable?: boolean,
        lazy?: boolean
    ): Promise<CoWebsite> {
        const result: { id: string } = await queryWorkadventure({
            type: "openCoWebsite",
            data: {
                url,
                allowApi,
                allowPolicy,
                widthPercent,
                position,
                closable,
                lazy,
            },
        });
        return new CoWebsite(result.id);
    }

    /**
     * Get all opened co-websites with their ids and positions.
     * {@link https://docs.workadventu.re/map-building/api-nav.md#get-all-co-websites | Website documentation}
     *
     * @returns {CoWebsite[]} All Cowebsites
     */
    async getCoWebSites(): Promise<CoWebsite[]> {
        const result = await queryWorkadventure({
            type: "getCoWebsites",
            data: undefined,
        });
        return result.map((cowebsiteEvent) => new CoWebsite(cowebsiteEvent.id));
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

    /**
     * Redirect the user to the OIDC login page
     */
    goToLogin() {
        return queryWorkadventure({
            type: "goToLogin",
            data: undefined,
        });
    }
}

export default new WorkadventureNavigationCommands();
