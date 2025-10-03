/**
 * This function sorts an array of items based on their priority.
 * Items will not be strictly sorted by priority. Instead, the function guarantees that the "n" first items
 * are the "n" items with the highest priority (lowest numerical value).
 * If an item with a high priority appears after the first "n" items, it will swap places with the lowest priority item
 * within the first "n" items.
 *
 * Furthermore, the sort is stable. 2 items with the same priority will keep their relative order from a previous ordering.
 *
 * @param items Items indexed by their uniqueId
 * @param n
 * @param currentOrder An array of uniqueIds representing the previous order of items. This array will be mutated to reflect the new order.
 * @returns An array of the "n" items with the highest priority, sorted by priority and previous order and a flag indicating if the order changed compared to the last run.
 */
export function stableNSort<T extends { uniqueId: string; priority: number }>(
    items: Map<string, T>,
    n: number,
    currentOrder: string[]
): {
    items: T[];
    orderChanged: boolean;
} {
    let foundDifference = false;

    // Let's do a diff between currentOrder and the new streamableCollectionStore.
    // First, let's remove from currentOrder all items that are not in the new streamableCollectionStore.
    for (let i = currentOrder.length - 1; i >= 0; i--) {
        const uniqueId = currentOrder[i];
        if (!items.has(uniqueId)) {
            currentOrder.splice(i, 1);
            foundDifference = true;
        }
    }

    // Now, let's add to currentOrder all items that are in the new streamableCollectionStore but not in currentOrder.
    items.forEach((streamable) => {
        if (!currentOrder.includes(streamable.uniqueId)) {
            currentOrder.push(streamable.uniqueId);
            foundDifference = true;
        }
    });

    // Now, we need to sort the items by priority.
    const sortedCollectionStore = Array.from(items.values()).sort((a, b) => {
        if (a.priority === b.priority) {
            // We need a stable sort. If 2 items have the same priority (probably because none is speaking), we need to keep the previous order from currentOrder.
            const indexA = currentOrder.indexOf(a.uniqueId);
            const indexB = currentOrder.indexOf(b.uniqueId);
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB; // Maintain the order from currentOrder
            } else if (indexA !== -1) {
                // Should never happen, but let's handle it gracefully.
                return -1; // a is in currentOrder, b is not
            } else if (indexB !== -1) {
                // Should never happen, but let's handle it gracefully.
                return 1; // b is in currentOrder, a is not
            }
        }
        return a.priority - b.priority;
    });

    // For the first n items of sortedCollectionStore, we need to make sure they are in the first n items of currentOrder.
    const currentOrderVisibleItems = currentOrder.slice(0, n);

    for (let i = 0; i < n && i < sortedCollectionStore.length; i++) {
        const streamable = sortedCollectionStore[i];
        if (!currentOrderVisibleItems.includes(streamable.uniqueId)) {
            // One of the items in the first n items of sortedCollectionStore is not in currentOrderVisibleItems.
            // Let's switch the less important item in currentOrderVisibleItems with the current streamable.
            // Let's find the less important item in currentOrderVisibleItems.
            let lessImportantItemIndex = -1;
            let lessImportantItemPriority = Number.MIN_SAFE_INTEGER;
            for (let j = 0; j < currentOrderVisibleItems.length; j++) {
                const uniqueId = currentOrderVisibleItems[j];
                const item = items.get(uniqueId);
                if (item && item.priority > lessImportantItemPriority) {
                    foundDifference = true;
                    lessImportantItemPriority = item.priority;
                    lessImportantItemIndex = j;
                }
            }
            if (lessImportantItemIndex === -1) {
                throw new Error("No less important item found in currentOrderVisibleItems");
            }
            // Now let's find the index of the item we want to switch with the less important item.
            const indexToSwitch = currentOrder.indexOf(streamable.uniqueId);
            if (indexToSwitch === -1) {
                throw new Error("Item to switch not found in currentOrder");
            }
            // Now let's switch the items.
            const lessImportantItemUniqueId = currentOrder[lessImportantItemIndex];
            currentOrder[lessImportantItemIndex] = streamable.uniqueId;
            currentOrderVisibleItems[lessImportantItemIndex] = streamable.uniqueId;
            currentOrder[indexToSwitch] = lessImportantItemUniqueId;
        }
    }

    // Finally, let's build the ordered array based on currentOrder.
    return {
        orderChanged: foundDifference,
        items: currentOrder.map((uniqueId) => items.get(uniqueId)).filter((item) => item !== undefined),
    };
}
