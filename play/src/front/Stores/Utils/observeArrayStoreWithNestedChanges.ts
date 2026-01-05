import { type Readable, type Unsubscriber, get } from "svelte/store";
import { Observable } from "rxjs";

export type ArrayChangeEvent<T, K> =
    | { type: "add"; item: T; key: K }
    | { type: "delete"; item: T; key: K }
    | { type: "update"; item: T; key: K; previousItem: T };

export interface ObserveArrayStoreChangesOptions {
    /**
     * If true, emits "add" events for all items that exist when subscribing.
     * If false, only emits events for changes that occur after subscription.
     * Default: true
     */
    emitInitial?: boolean;
}

/**
 * Observes an array store and emits events when items are added, deleted, or updated.
 * This is a generic function that can be reused for any array store.
 *
 * @param arrayStore - The store containing an array of items
 * @param options - Optional configuration object
 * @param options.emitInitial - If true (default), emits "add" events for all existing items when subscribing. If false, only emits events for changes after subscription.
 * @param options.getKey - Optional function to extract a unique key from each item. If not provided, the item itself is used as the key (by reference).
 * @returns An Observable that emits change events for add/delete/update operations
 *
 * @example
 * ```typescript
 * // Default behavior: emit initial items, use object reference as key
 * const changes$ = observeArrayStoreChanges(someArrayStore);
 *
 * // With getKey, emit initial items (default)
 * const changes$ = observeArrayStoreChanges(videoStreamElementsStore, {
 *   getKey: (peer) => peer.uniqueId
 * });
 *
 * // Don't emit initial items, only future changes
 * const changes$ = observeArrayStoreChanges(videoStreamElementsStore, {
 *   getKey: (peer) => peer.uniqueId,
 *   emitInitial: false
 * });
 *
 * changes$.subscribe((event) => {
 *   if (event.type === "add") {
 *     // Handle new item
 *   } else if (event.type === "delete") {
 *     // Handle removed item
 *   } else if (event.type === "update") {
 *     // Handle updated item
 *   }
 * });
 * ```
 */
export function observeArrayStoreChanges<T, K = T>(
    arrayStore: Readable<T[]>,
    options?: ObserveArrayStoreChangesOptions & { getKey?: (item: T) => K }
): Observable<ArrayChangeEvent<T, K>> {
    const finalOptions = options ?? {};
    const emitInitial = finalOptions.emitInitial ?? true;
    const getKey = finalOptions.getKey;

    return new Observable<ArrayChangeEvent<T, K>>((subscriber) => {
        const trackedItems = new Map<K, T>();
        const keyExtractor = getKey ?? ((item: T) => item as unknown as K);
        let isInitialEmission = true;

        const updateTracking = (newItems: T[]) => {
            const newKeys = new Set(newItems.map(keyExtractor));

            // Handle deletions
            for (const [key, trackedItem] of trackedItems.entries()) {
                if (!newKeys.has(key)) {
                    trackedItems.delete(key);
                    subscriber.next({ type: "delete", item: trackedItem, key });
                }
            }

            // Handle additions and updates
            for (const newItem of newItems) {
                const key = keyExtractor(newItem);
                const existing = trackedItems.get(key);

                if (!existing) {
                    // New item
                    trackedItems.set(key, newItem);
                    // Only emit "add" if it's not the initial emission or if emitInitial is true
                    if (!isInitialEmission || emitInitial) {
                        subscriber.next({ type: "add", item: newItem, key });
                    }
                } else {
                    // Item exists - check if it's actually a different reference
                    if (existing !== newItem) {
                        // Item reference changed - emit update
                        subscriber.next({ type: "update", item: newItem, key, previousItem: existing });
                        trackedItems.set(key, newItem);
                    }
                }
            }

            // Mark that initial emission is done
            if (isInitialEmission) {
                isInitialEmission = false;
            }
        };

        // Subscribe to the array store
        const arrayUnsubscriber = arrayStore.subscribe((items) => {
            updateTracking(items);
        });

        // Cleanup function
        return () => {
            arrayUnsubscriber();
            trackedItems.clear();
        };
    });
}

/**
 * Observes an array store and its nested stores, emitting events when items are added, deleted, or when nested stores change.
 * This function uses observeArrayStoreChanges for the array, then reuses the same logic to observe each nested store.
 * This allows for granular updates - only the changed item triggers an update event, not the entire array.
 *
 * @param arrayStore - The store containing an array of items
 * @param getKey - Function to extract a unique key from each item
 * @param getNestedStore - Function to extract a nested store from each item (e.g., item.streamable)
 * @returns An Observable that emits change events for add/delete/update operations
 *
 * @example
 * ```typescript
 * const changes$ = observeArrayStoreWithNestedChanges(
 *   videoStreamElementsStore,
 *   (peer) => peer.uniqueId,
 *   (peer) => peer.streamable
 * );
 *
 * changes$.subscribe((event) => {
 *   if (event.type === "add") {
 *     // Handle new peer
 *   } else if (event.type === "delete") {
 *     // Handle removed peer
 *   } else if (event.type === "update") {
 *     // Handle updated peer (e.g., streamable changed)
 *   }
 * });
 * ```
 */
export function observeArrayStoreWithNestedChanges<T, K, N>(
    arrayStore: Readable<T[]>,
    getKey: (item: T) => K,
    getNestedStore: (item: T) => Readable<N | undefined>
): Observable<ArrayChangeEvent<T, K>> {
    return new Observable<ArrayChangeEvent<T, K>>((subscriber) => {
        const trackedItems = new Map<
            K,
            { item: T; lastNestedValue: N | undefined; previousItemSnapshot: T; unsubscriber: Unsubscriber }
        >();

        // Helper function to create a shallow copy of an item
        const createItemSnapshot = (item: T): T => {
            return Object.assign({}, item);
        };

        // Use observeArrayStoreChanges to observe the array
        const arrayChanges$ = observeArrayStoreChanges<T, K>(arrayStore, {
            getKey,
        });
        const arrayChangesSubscription = arrayChanges$.subscribe((event) => {
            if (event.type === "add") {
                // New item - track it and subscribe to its nested store
                const nestedStore = getNestedStore(event.item);
                const initialNestedValue = get(nestedStore);

                // Reuse observeArrayStoreChanges logic for the nested store
                // Since nested store is a single value store, we observe it directly
                const nestedUnsubscriber = nestedStore.subscribe((nestedValue) => {
                    const tracked = trackedItems.get(event.key);
                    if (tracked) {
                        // Only emit update if the nested value actually changed
                        if (tracked.lastNestedValue !== nestedValue) {
                            // Use the stored snapshot as previousItem before updating it
                            const previousItem = tracked.previousItemSnapshot;
                            subscriber.next({
                                type: "update",
                                item: tracked.item,
                                key: event.key,
                                previousItem,
                            });
                            // Update the snapshot for the next change
                            tracked.previousItemSnapshot = createItemSnapshot(tracked.item);
                            tracked.lastNestedValue = nestedValue;
                        }
                    }
                });

                trackedItems.set(event.key, {
                    item: event.item,
                    lastNestedValue: initialNestedValue,
                    previousItemSnapshot: createItemSnapshot(event.item),
                    unsubscriber: nestedUnsubscriber,
                });
                subscriber.next(event);
            } else if (event.type === "delete") {
                // Item deleted - cleanup nested store subscription
                const tracked = trackedItems.get(event.key);
                if (tracked) {
                    tracked.unsubscriber();
                    trackedItems.delete(event.key);
                }
                subscriber.next(event);
            } else if (event.type === "update") {
                // Item reference changed - use the previousItem from the event
                const tracked = trackedItems.get(event.key);
                if (tracked) {
                    tracked.unsubscriber();
                }

                const nestedStore = getNestedStore(event.item);
                const initialNestedValue = get(nestedStore);

                const nestedUnsubscriber = nestedStore.subscribe((nestedValue) => {
                    const currentTracked = trackedItems.get(event.key);
                    if (currentTracked) {
                        if (currentTracked.lastNestedValue !== nestedValue) {
                            // Use the stored snapshot as previousItem before updating it
                            const previousItem = currentTracked.previousItemSnapshot;
                            subscriber.next({
                                type: "update",
                                item: currentTracked.item,
                                key: event.key,
                                previousItem,
                            });
                            // Update the snapshot for the next change
                            currentTracked.previousItemSnapshot = createItemSnapshot(currentTracked.item);
                            currentTracked.lastNestedValue = nestedValue;
                        }
                    }
                });

                trackedItems.set(event.key, {
                    item: event.item,
                    lastNestedValue: initialNestedValue,
                    previousItemSnapshot: createItemSnapshot(event.item),
                    unsubscriber: nestedUnsubscriber,
                });
                // Forward the update event with the correct previousItem from observeArrayStoreChanges
                subscriber.next(event);
            }
        });

        // Cleanup function
        return () => {
            arrayChangesSubscription.unsubscribe();
            for (const tracked of trackedItems.values()) {
                tracked.unsubscriber();
            }
            trackedItems.clear();
        };
    });
}
