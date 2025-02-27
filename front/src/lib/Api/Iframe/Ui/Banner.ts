import { sendToWorkadventure, IframeApiContribution } from "../IframeApiContribution";
import { BannerEvent } from "./../../Events/Ui/BannerEvent";

export class WorkadventureBannerCommands extends IframeApiContribution<WorkadventureBannerCommands> {
    callbacks = [];

    /**
     * Open banner message with link
     *
     * {@link http://workadventure.localhost/map-building/api-ui.md#open-banner | Website documentation}
     * @param bannerEvent
     * @returns
     */
    public openBanner(bannerEvent: BannerEvent): void {
        sendToWorkadventure({
            type: "openBanner",
            data: bannerEvent,
        });
    }

    /**
     * Close banner message
     * {@link http://workadventure.localhost/map-building/api-ui.md#close-banner | Website documentation}
     * @returns
     */
    public closeBanner() {
        sendToWorkadventure({
            type: "closeBanner",
        });
    }
}

export default new WorkadventureBannerCommands();
