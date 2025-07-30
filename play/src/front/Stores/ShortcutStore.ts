import { writable } from "svelte/store";

export interface Shortcut {
    key: string;
    description: string;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
}

export interface ShortcutStore {
    shortcuts: Shortcut[];
}

const createShortcutStore = () => {
    const { subscribe, set, update } = writable<ShortcutStore>({
        shortcuts: [],
    });

    return {
        subscribe,
        addShortcut: (shortcut: Shortcut) =>
            update((store) => ({
                ...store,
                shortcuts: [...store.shortcuts, shortcut],
            })),
        removeShortcut: (key: string) =>
            update((store) => ({
                ...store,
                shortcuts: store.shortcuts.filter((s) => s.key !== key),
            })),
        getShortcuts: () => {
            let currentStore: ShortcutStore;
            subscribe((store) => (currentStore = store))();
            return currentStore!.shortcuts;
        },
        reset: () => set({ shortcuts: [] }),
    };
};

export const shortcutStore = createShortcutStore();
