import { get } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import type { CreateUIWebsiteEvent, ModifyUIWebsiteEvent, UIWebsiteEvent } from "../../../Api/Events/Ui/UIWebsiteEvent";
import { iframeListener } from "../../../Api/IframeListener";
import { uiWebsitesStore } from "../../../Stores/UIWebsiteStore";
import { analyticsClient } from "../../../Administration/AnalyticsClient";
import { stripUrlToOrigin } from "../../../Administration/CowebsiteAnalyticsProperties";
import { gameManager } from "../GameManager";

class UIWebsiteManager {
    constructor() {
        // This is a singleton, so we subscribe to iframeListener only once and never unsubscribe.
        //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
        iframeListener.modifyUIWebsiteStream.subscribe((websiteEvent: ModifyUIWebsiteEvent) => {
            const website = get(uiWebsitesStore).find((currentWebsite) => currentWebsite.id === websiteEvent.id);
            if (!website) {
                throw new Error(`Could not find ui website with the id "${websiteEvent.id}" in your map`);
            }

            if (websiteEvent.url) {
                website.url = new URL(websiteEvent.url, gameManager.getCurrentGameScene().getMapUrl()).toString();

                // The resolved URL, not the event's: a map may pass a relative one, and
                // it is relative to the TMJ file rather than to the app. Reporting the
                // raw value would name the app's own origin for every one of them.
                analyticsClient.trackAdminEvent("scripting.website_opened", { url: stripUrlToOrigin(website.url) });
            }

            if (websiteEvent.visible !== undefined) {
                website.visible = websiteEvent.visible;
            }

            if (websiteEvent.position) {
                if (websiteEvent.position.horizontal) {
                    website.position.horizontal = websiteEvent.position.horizontal;
                }

                if (websiteEvent.position.vertical) {
                    website.position.vertical = websiteEvent.position.vertical;
                }
            }

            if (websiteEvent.size) {
                if (websiteEvent.size.height) {
                    website.size.height = websiteEvent.size.height;
                }

                if (websiteEvent.size.width) {
                    website.size.width = websiteEvent.size.width;
                }
            }

            if (websiteEvent.margin) {
                website.margin = {};

                if (websiteEvent.margin.top !== undefined) {
                    website.margin.top = websiteEvent.margin.top;
                }

                if (websiteEvent.margin.bottom !== undefined) {
                    website.margin.bottom = websiteEvent.margin.bottom;
                }

                if (websiteEvent.margin.left !== undefined) {
                    website.margin.left = websiteEvent.margin.left;
                }

                if (websiteEvent.margin.right !== undefined) {
                    website.margin.right = websiteEvent.margin.right;
                }
            }

            uiWebsitesStore.update(website);
        });
    }

    public open(websiteConfig: CreateUIWebsiteEvent): UIWebsiteEvent {
        const newWebsite: UIWebsiteEvent = {
            ...websiteConfig,
            id: uuidv4(),
            visible: websiteConfig.visible ?? true,
            allowPolicy: websiteConfig.allowPolicy ?? "",
            allowApi: websiteConfig.allowApi ?? false,
        };
        // If a relative URL is passed, it is relative to the TMJ file.
        websiteConfig.url = new URL(websiteConfig.url, gameManager.getCurrentGameScene().getMapUrl()).toString();
        uiWebsitesStore.add(newWebsite);

        // Analytics tracking opening a website
        analyticsClient.trackAdminEvent("scripting.website_opened", { url: stripUrlToOrigin(websiteConfig.url) });
        return newWebsite;
    }

    public getAll(): UIWebsiteEvent[] {
        return get(uiWebsitesStore);
    }

    public getById(websiteId: string): UIWebsiteEvent | undefined {
        return get(uiWebsitesStore).find((currentWebsite) => currentWebsite.id === websiteId);
    }

    public close(websiteId: string) {
        const uiWebsite = this.getById(websiteId);

        if (!uiWebsite) {
            return;
        }

        uiWebsitesStore.remove(uiWebsite);
    }

    public closeAll() {
        get(uiWebsitesStore).forEach((uiWebsite: UIWebsiteEvent) => {
            uiWebsitesStore.remove(uiWebsite);
        });
    }
}

export const uiWebsiteManager = new UIWebsiteManager();
