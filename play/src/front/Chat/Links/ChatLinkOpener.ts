import { analyticsClient } from "../../Administration/AnalyticsClient";
import { scriptUtils } from "../../Api/ScriptUtils";
import { gameManager } from "../../Phaser/Game/GameManager";
import { openCoWebSiteWithoutSource } from "../Utils";

function openInNewTab(url: string): void {
    try {
        scriptUtils.openTab(url);
    } catch (error) {
        console.error("Failed to open chat link in a new tab", error);
        window.open(url, "_blank", "noopener,noreferrer");
    }
}

/**
 * Opens a chat link as a co-website, falling back to a new tab whenever embedding
 * would leave the user staring at a blank iframe.
 */
export async function openChatLinkAsCoWebsite(rawUrl: string): Promise<void> {
    // getWebsiteUrl() reaches for the current game scene on Cards links, which throws
    // while a scene is being swapped.
    let url: string;
    try {
        url = scriptUtils.getWebsiteUrl(rawUrl);
    } catch (error) {
        console.info("Could not normalize chat link, opening it in a new tab instead", error);
        openInNewTab(rawUrl);
        return;
    }

    let embeddable: boolean;
    try {
        const answer = await gameManager.getCurrentGameScene().connection?.queryEmbeddableWebsite(url);
        // state=false means the URL is unreachable, embeddable=false means it refuses to be
        // framed. Both end up as a blank iframe, so both belong in a new tab.
        embeddable = answer?.state === true && answer.embeddable;
    } catch (error) {
        console.info("Could not check whether chat link is embeddable, opening it in a new tab instead", error);
        openInNewTab(rawUrl);
        return;
    }

    if (!embeddable) {
        openInNewTab(rawUrl);
        return;
    }

    openCoWebSiteWithoutSource({ url, closable: true });
    analyticsClient.openedWebsite(new URL(url));
}
