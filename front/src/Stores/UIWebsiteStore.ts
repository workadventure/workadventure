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
        update: (uiWebsite: UIWebsite) => {
            update((currentArray) =>
                currentArray.map((currentWebsite) => (currentWebsite.id === uiWebsite.id ? uiWebsite : currentWebsite))
            );
        },
        remove: (uiWebsite: UIWebsite) => {
            update((currentArray) => currentArray.filter((currentWebsite) => currentWebsite.id !== uiWebsite.id));
        },
    };
}

export const uiWebsitesStore = createUIWebsiteStore();
