import { derived, writable } from "svelte/store";
import { streamableCollectionStore } from "./StreamableCollectionStore";

const createMaxVisibleVideosStore = () => {
    // Initialiser avec une valeur par défaut de 0
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
        // Let's do a diff between currentOrderForStore and the new streamableCollectionStore.
        // First, let's remove from currentOrderForStore all items that are not in the new streamableCollectionStore.
        for (let i = currentOrderForStore.length - 1; i >= 0; i--) {
            const uniqueId = currentOrderForStore[i];
            if (!$streamableCollectionStore.has(uniqueId)) {
                currentOrderForStore.splice(i, 1);
            }
        }

        // Now, let's add to currentOrderForStore all items that are in the new streamableCollectionStore but not in currentOrderForStore.
        $streamableCollectionStore.forEach((streamable) => {
            if (!currentOrderForStore.includes(streamable.uniqueId)) {
                currentOrderForStore.push(streamable.uniqueId);
            }
        });

        // Now, we need to sort the $streamableCollectionStore by priority.
        const sortedCollectionStore = Array.from($streamableCollectionStore.values()).sort((a, b) => {
            if (a.priority === b.priority) {
                // We need a stable sort. If 2 items have the same priority (probably because none is speaking), we need to keep the previous order from currentOrderForStore.
                const indexA = currentOrderForStore.indexOf(a.uniqueId);
                const indexB = currentOrderForStore.indexOf(b.uniqueId);
                if (indexA !== -1 && indexB !== -1) {
                    return indexA - indexB; // Maintain the order from currentOrderForStore
                } else if (indexA !== -1) {
                    // Should never happen, but let's handle it gracefully.
                    return -1; // a is in currentOrderForStore, b is not
                } else if (indexB !== -1) {
                    // Should never happen, but let's handle it gracefully.
                    return 1; // b is in currentOrderForStore, a is not
                }
            }
            return a.priority - b.priority;
        });

        // For the first $maxVisibleVideosStore items of sortedCollectionStore, we need to make sure they are in the first $maxVisibleVideosStore items of currentOrderForStore.
        const currentOrderForStoreVisibleItems = currentOrderForStore.slice(0, $maxVisibleVideosStore);

        for (let i = 0; i < $maxVisibleVideosStore && i < sortedCollectionStore.length; i++) {
            const streamable = sortedCollectionStore[i];
            if (!currentOrderForStoreVisibleItems.includes(streamable.uniqueId)) {
                // One of the items in the first $maxVisibleVideosStore items of sortedCollectionStore is not in currentOrderForStoreVisibleItems.
                // Let's switch the less important item in currentOrderForStoreVisibleItems with the current streamable.
                // Let's find the less important item in currentOrderForStoreVisibleItems.
                let lessImportantItemIndex = -1;
                let lessImportantItemPriority = Number.MIN_SAFE_INTEGER;
                for (let j = 0; j < currentOrderForStoreVisibleItems.length; j++) {
                    const uniqueId = currentOrderForStoreVisibleItems[j];
                    const item = $streamableCollectionStore.get(uniqueId);
                    if (item && item.priority > lessImportantItemPriority) {
                        lessImportantItemPriority = item.priority;
                        lessImportantItemIndex = j;
                    }
                }
                if (lessImportantItemIndex === -1) {
                    throw new Error("No less important item found in currentOrderForStoreVisibleItems");
                }
                // Now let's find the index of the item we want to switch with the less important item.
                const indexToSwitch = currentOrderForStore.indexOf(streamable.uniqueId);
                if (indexToSwitch === -1) {
                    throw new Error("Item to switch not found in currentOrderForStore");
                }
                // Now let's switch the items.
                const lessImportantItemUniqueId = currentOrderForStore[lessImportantItemIndex];
                currentOrderForStore[lessImportantItemIndex] = streamable.uniqueId;
                currentOrderForStoreVisibleItems[lessImportantItemIndex] = streamable.uniqueId;
                currentOrderForStore[indexToSwitch] = lessImportantItemUniqueId;
            }
        }

        // Finally, let's build the ordered array based on currentOrderForStore.
        return currentOrderForStore
            .map((uniqueId) => $streamableCollectionStore.get(uniqueId))
            .filter((item) => item !== undefined);
    }
);
