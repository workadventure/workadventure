import { get } from "svelte/store";
import { CreateUIWebsiteEvent, ModifyUIWebsiteEvent, UIWebsite } from "../../../Api/Events/ui/UIWebsite";
import { iframeListener } from "../../../Api/IframeListener";
import { v4 as uuidv4 } from "uuid";
import { uiWebsitesStore } from "../../../Stores/UIWebsiteStore";

class UIWebsiteManager {
    constructor() {
        iframeListener.modifyUIWebsiteStream.subscribe((websiteEvent: ModifyUIWebsiteEvent) => {
            const website = get(uiWebsitesStore).find((currentWebsite) => currentWebsite.id === websiteEvent.id);
            if (!website) {
                throw new Error(`Could not find ui website with the id "${websiteEvent.id}" in your map`);
            }

            if (websiteEvent.url) {
                website.url = websiteEvent.url;
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

    public open(websiteConfig: CreateUIWebsiteEvent): UIWebsite {
        const newWebsite: UIWebsite = {
            ...websiteConfig,
            id: uuidv4(),
            visible: websiteConfig.visible ?? true,
            allowPolicy: websiteConfig.allowPolicy ?? "",
            allowApi: websiteConfig.allowApi ?? false,
        };

        uiWebsitesStore.add(newWebsite);

        return newWebsite;
    }

    public getAll(): UIWebsite[] {
        return get(uiWebsitesStore);
    }

    public close(websiteId: string) {
        const uiWebsite = get(uiWebsitesStore).find((currentWebsite) => currentWebsite.id === websiteId);

        if (!uiWebsite) {
            return;
        }

        uiWebsitesStore.remove(uiWebsite);
    }
}

export const uiWebsiteManager = new UIWebsiteManager();
