import { writable } from "svelte/store";
import type { UIWebsiteEvent } from "../Api/Events/Ui/UIWebsiteEvent";

function createUIWebsiteStore() {
    const { subscribe, update, set } = writable(Array<UIWebsiteEvent>());

    set(Array<UIWebsiteEvent>());

    return {
        subscribe,
        add: (uiWebsite: UIWebsiteEvent) => {
            update((currentArray) => [...currentArray, uiWebsite]);
        },
        update: (uiWebsite: UIWebsiteEvent) => {
            update((currentArray) =>
                currentArray.map((currentWebsite) => (currentWebsite.id === uiWebsite.id ? uiWebsite : currentWebsite))
            );
        },
        remove: (uiWebsite: UIWebsiteEvent) => {
            update((currentArray) => currentArray.filter((currentWebsite) => currentWebsite.id !== uiWebsite.id));
        },
    };
}

export const uiWebsitesStore = createUIWebsiteStore();
