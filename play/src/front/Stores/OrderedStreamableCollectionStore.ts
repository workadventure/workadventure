import { derived, writable } from "svelte/store";
import { streamableCollectionStore } from "./StreamableCollectionStore";
import { stableNSort } from "./StableNSorter";

const createMaxVisibleVideosStore = () => {
    // Initialize with default value of 0
    const { subscribe, set } = writable<number>(0);
    let currentValue = 0;

    return {
        subscribe,
        set: (value: number) => {
            // Only update the store if the value has changed
            if (currentValue !== value) {
                currentValue = value;
                set(value);
            }
        },
    };
};

export const maxVisibleVideosStore = createMaxVisibleVideosStore();

// This variable will hold the order of streamable collection items currently displayed.
const currentOrderForStore: string[] = [];

export const orderedStreamableCollectionStore = derived(
    [streamableCollectionStore, maxVisibleVideosStore],
    ([$streamableCollectionStore, $maxVisibleVideosStore]) => {
        return stableNSort($streamableCollectionStore, $maxVisibleVideosStore, currentOrderForStore);
    }
);
