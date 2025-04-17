import { writable } from "svelte/store";

export type ActionBarItem = {
    id: string;
    label: string;
    callback: () => void;
    coWebsiteUrl?: string;
};

function createActionBarStore() {
    const { subscribe, update } = writable<ActionBarItem[]>([]);

    return {
        subscribe,
        addItem: (item: ActionBarItem) => {
            update((items) => {
                // Vérifie si un élément avec le même ID existe déjà
                if (!items.find((i) => i.id === item.id)) {
                    items.push(item);
                }
                return items;
            });
        },
        removeItem: (id: string) => {
            update((items) => items.filter((item) => item.id !== id));
            console.log(`Item with id ${id} removed from contextual menu`);
        },
        clear: () => {
            update(() => []);
        },
    };
}

export const contextualMenuItemsStore = createActionBarStore();