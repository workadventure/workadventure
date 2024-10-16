import { CardsService, GoogleWorkSpaceService, KlaxoonService } from "@workadventure/shared-utils";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { gameManager } from "../Phaser/Game/GameManager";

class ScriptUtils {
    public openTab(url: string) {
        // Get URL from the website
        url = this.getWebsiteUrl(url);

        // Open the url in a new tab
        window.open(url);

        // Analytics tracking for opening a new tab
        analyticsClient.openedWebsite(new URL(url));
    }

    public goToPage(url: string) {
        // Test if the url is a valid URL
        // eslint-disable-next-line
        const urlPattern = /(?:https?):\/\/(\w+:?\w*)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/g;
        let urlToTrack = url;
        if (!urlPattern.test(url)) {
            // Update the url with the current origin
            urlToTrack = `${this.inIframe() ? window.parent.location.origin : window.location.origin}${urlToTrack}`;
        }
        // Analytics tracking for opening a new tab
        if (urlPattern.test(urlToTrack)) {
            analyticsClient.openedWebsite(new URL(urlToTrack));
        }

        window.location.href = url;
    }

    private inIframe() {
        try {
            return window.self !== window.top;
        } catch (e) {
            console.info("Error in checking if in iframe", e);
            return true;
        }
    }

    public getWebsiteUrl(url: string) {
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            // Relative URL, let's return right away.
            return url;
        }
        const urlApi = new URL(url);
        // Check if the url is a klaxoon link
        if (KlaxoonService.isKlaxoonLink(urlApi)) {
            // If it is a Klaxoon link opening in new tab, we need to remove the embedded parameter
            url = KlaxoonService.getKlaxoonBasicUrl(urlApi);
        }

        // Check if the url is a Google WorkSpace link
        if (GoogleWorkSpaceService.isEmbedableGooglWorkSapceLink(urlApi)) {
            // If it a Google WorkSpace link opening in new tab, we need to remove the embedded parameter
            url = GoogleWorkSpaceService.getGoogleWorkSpaceBasicUrl(urlApi);
        }

        // Check if the Url is a Cards link
        if (CardsService.isCardsLink(urlApi)) {
            // If it is a Cards link opening in new tab, we need to remove the token parameter
            const userRoomToken = gameManager.getCurrentGameScene().connection?.userRoomToken;
            url = CardsService.getCardsLink(urlApi, userRoomToken);
        }

        return url;
    }
}

export const scriptUtils = new ScriptUtils();
