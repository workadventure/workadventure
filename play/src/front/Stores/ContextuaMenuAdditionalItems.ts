import { writable } from "svelte/store";

export type ActionBarItem = {
    id: string;
    label: string;
    callback: () => void;
    coWebsiteUrl?: string;
};

function createContextualMenuItemsStore() {
    const { subscribe, update } = writable<ActionBarItem[]>([]);

    return {
        subscribe,
        addItem: (item: ActionBarItem) => {
            update((items) => {
                if (!items.find((i) => i.id === item.id)) {
                    items.push(item);
                }
                return items;
            });
        },
        removeItem: (id: string) => {
            update((items) => {
                return items.filter((item) => item.id !== id);
            });
        },
        clear: () => {
            update(() => []);
        },
    };
}

export const contextualMenuItemsStore = createContextualMenuItemsStore();
