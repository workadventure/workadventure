import { get, readable, Readable, Unsubscriber } from "svelte/store";

/**
 * Creates a store that allows accessing a store inside a store. Should one of the stores be updated, the returned
 * store will be updated.
 *
 * Sample:
 *
 * ```
 * const rootStore = writable({
 *   "foo": 12,
 *   "store": writable("baz")
 * });
 * const nestedStore = createNestedStore(rootStore, (root) => root.store);
 * // nestedStore tracks the store in the ".store" property.
 * ```
 */
export function createNestedStore<T, U>(rootStore: Readable<T>, accessor: (rootStore: T) => Readable<U>): Readable<U> {
    const initVal = get(rootStore);
    let initStore: Readable<U> | undefined;
    let initStoreValue: U | undefined;
    if (initVal) {
        initStore = accessor(initVal);
        if (initStore !== undefined) {
            initStoreValue = get(initStore);
        }
    }

    return readable<U>(initStoreValue, (set) => {
        let unsubscribeDeepStore: Unsubscriber | undefined;
        const unsubscribe = rootStore.subscribe((newRoot) => {
            if (unsubscribeDeepStore) {
                unsubscribeDeepStore();
                unsubscribeDeepStore = undefined;
            }
            const deepValueStore = accessor(newRoot);
            if (deepValueStore !== undefined) {
                set(get(deepValueStore));

                unsubscribeDeepStore = deepValueStore.subscribe((value) => {
                    set(value);
                });
            }
        });

        return () => {
            unsubscribe();
            if (unsubscribeDeepStore) {
                unsubscribeDeepStore();
                unsubscribeDeepStore = undefined;
            }
        };
    });
}
