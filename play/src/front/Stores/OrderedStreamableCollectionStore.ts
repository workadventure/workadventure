import { derived, writable } from "svelte/store";
import type { VideoBox } from "../Space/Space";
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

// This store can be used to trigger a re-evaluation of the orderedStreamableCollectionStore.
// It can be useful when something external to the streamableCollectionStore or maxVisibleVideosStore changes
// that should trigger a reordering of the items (for example, a new order of the speakers sent by Livekit).
// The value of the store is meaningless, only the fact that it changed is important.
export const triggerReorderStore = writable(0);

// This variable will hold the order of streamable collection items currently displayed.
const currentOrderForStore: string[] = [];

export const orderedStreamableCollectionStore = derived(
    [streamableCollectionStore, maxVisibleVideosStore, triggerReorderStore],
    ([$streamableCollectionStore, $maxVisibleVideosStore, $triggerReorderStore], set) => {
        const { items, orderChanged } = stableNSort(
            $streamableCollectionStore,
            $maxVisibleVideosStore,
            currentOrderForStore
        );
        if (orderChanged) {
            // Only update the store if the order has changed
            set(items);
        }

        return;
    },
    [] as VideoBox[]
);
