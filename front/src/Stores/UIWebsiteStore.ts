import { writable } from "svelte/store";
import { UIWebsite } from "../Api/Events/ui/UIWebsite";

function createUIWebsiteStore() {
    const { subscribe, update, set } = writable(Array<UIWebsite>());

    set(Array<UIWebsite>());

    return {
        subscribe,
        add: (uiWebsite: UIWebsite) => {
            update((currentArray) => [...currentArray, uiWebsite]);
        },
        remove: (uiWebsite: UIWebsite) => {
            update((currentArray) => currentArray.filter((currentWebsite) => currentWebsite.id !== uiWebsite.id));
        },
    };
}

export const uiWebsitesStore = createUIWebsiteStore();
