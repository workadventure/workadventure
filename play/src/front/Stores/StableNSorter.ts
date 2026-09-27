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
    currentOrder: string[],
): {
    items: T[];
    orderChanged: boolean;
} {
    let foundDifference = false;

    // Let's do a diff between currentOrder and the new streamableCollectionStore.
    // First, let's remove from currentOrder all items that are not in the new streamableCollectionStore.
    const remainingOrder = currentOrder.filter((uniqueId) => items.has(uniqueId));
    if (remainingOrder.length !== currentOrder.length) {
        currentOrder.length = 0;
        currentOrder.push(...remainingOrder);
        foundDifference = true;
    }

    // Now, let's add to currentOrder all items that are in the new streamableCollectionStore but not in currentOrder.
    const knownUniqueIds = new Set(currentOrder);
    items.forEach((streamable) => {
        if (!knownUniqueIds.has(streamable.uniqueId)) {
            currentOrder.push(streamable.uniqueId);
            foundDifference = true;
        }
    });

    // Position of each item in currentOrder, kept up to date when items are swapped below.
    // Looking positions up with indexOf / includes instead made the sort O(n² log n) (a few ms with 500 users).
    const positions = new Map(currentOrder.map((uniqueId, index) => [uniqueId, index]));
    const positionOf = (uniqueId: string): number => positions.get(uniqueId) ?? Number.MAX_SAFE_INTEGER;

    // Now, we need to sort the items by priority.
    // We need a stable sort. If 2 items have the same priority (probably because none is speaking), we need to keep
    // the previous order from currentOrder.
    const sortedCollectionStore = Array.from(items.values()).sort(
        (a, b) => a.priority - b.priority || positionOf(a.uniqueId) - positionOf(b.uniqueId),
    );

    // For the first n items of sortedCollectionStore, we need to make sure they are in the first n items of currentOrder.
    const visibleCount = Math.min(n, currentOrder.length);

    for (let i = 0; i < n && i < sortedCollectionStore.length; i++) {
        const streamable = sortedCollectionStore[i];
        const indexToSwitch = positionOf(streamable.uniqueId);
        if (indexToSwitch >= visibleCount) {
            // One of the items in the first n items of sortedCollectionStore is not in the first n items of currentOrder.
            // Let's switch the less important item in the first n items of currentOrder with the current streamable.
            // Let's find the less important item in the first n items of currentOrder.
            let lessImportantItemIndex = -1;
            let lessImportantItemPriority = Number.MIN_SAFE_INTEGER;
            for (let j = 0; j < visibleCount; j++) {
                const item = items.get(currentOrder[j]);
                if (item && item.priority > lessImportantItemPriority) {
                    lessImportantItemPriority = item.priority;
                    lessImportantItemIndex = j;
                }
            }
            if (lessImportantItemIndex === -1) {
                throw new Error("No less important item found in currentOrderVisibleItems");
            }
            if (indexToSwitch >= currentOrder.length) {
                throw new Error("Item to switch not found in currentOrder");
            }
            // Now let's switch the items.
            const lessImportantItemUniqueId = currentOrder[lessImportantItemIndex];
            currentOrder[lessImportantItemIndex] = streamable.uniqueId;
            currentOrder[indexToSwitch] = lessImportantItemUniqueId;
            positions.set(streamable.uniqueId, lessImportantItemIndex);
            positions.set(lessImportantItemUniqueId, indexToSwitch);
            foundDifference = true;
        }
    }

    // Finally, let's build the ordered array based on currentOrder.
    return {
        orderChanged: foundDifference,
        items: currentOrder.map((uniqueId) => items.get(uniqueId)).filter((item) => item !== undefined),
    };
}
