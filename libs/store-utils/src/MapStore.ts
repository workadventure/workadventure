import type { Readable, Subscriber, Unsubscriber, Writable } from "svelte/store";
import { derived, get, readable, writable } from "svelte/store";

/**
 * Is it a Map? Is it a Store? No! It's a MapStore!
 *
 * The MapStore behaves just like a regular JS Map, but... it is also a regular Svelte store.
 *
 * As a bonus, you can also get a store on any given key of the map.
 *
 * For instance:
 *
 * const mapStore = new MapStore<string, string>();
 * mapStore.getStore('foo').subscribe((value) => {
 *     console.log('Foo key has been written to the store. New value: ', value);
 * });
 * mapStore.set('foo', 'bar');
 *
 *
 * Even better, if the items stored in map contain stores, you can directly get the store to those values:
 *
 * const mapStore = new MapStore<string, {
 *     nestedStore: Readable<string>
 * }>();
 *
 * mapStore.getNestedStore('foo', item => item.nestedStore).subscribe((value) => {
 *     console.log('Foo key has been written to the store or the nested store has been updated. New value: ', value);
 * });
 * mapStore.set('foo', {
 *     nestedStore: writable('bar')
 * });
 * // Whenever the nested store is updated OR the 'foo' key is overwritten, the store returned by mapStore.getNestedStore
 * // will be triggered.
 */
export class MapStore<K, V> extends Map<K, V> implements Readable<Map<K, V>> {
    private readonly store = writable(this);
    private readonly storesByKey = new Map<K, Writable<V | undefined>>();

    subscribe(run: Subscriber<Map<K, V>>, invalidate?: (value?: Map<K, V>) => void): Unsubscriber {
        return this.store.subscribe(run, invalidate);
    }

    clear() {
        super.clear();
        this.store.set(this);
        this.storesByKey.forEach((store) => {
            store.set(undefined);
        });
    }

    delete(key: K): boolean {
        const result = super.delete(key);
        if (result) {
            this.store.set(this);
            this.storesByKey.get(key)?.set(undefined);
        }
        return result;
    }

    set(key: K, value: V): this {
        super.set(key, value);
        this.store.set(this);
        this.storesByKey.get(key)?.set(value);
        return this;
    }

    getStore(key: K): Readable<V | undefined> {
        let store = this.storesByKey.get(key);
        if (store !== undefined) {
            return store;
        }
        store = writable(this.get(key), () => {
            return () => {
                // No more subscribers!
                this.storesByKey.delete(key);
            };
        });
        this.storesByKey.set(key, store);
        return store;
    }

    /**
     * Returns an "inner" store inside a value stored in the map.
     */
    getNestedStore<T>(key: K, accessor: (value: V) => Readable<T> | undefined): Readable<T | undefined> {
        const initVal = this.get(key);
        let initStore: Readable<T> | undefined;
        let initStoreValue: T | undefined;
        if (initVal) {
            initStore = accessor(initVal);
            if (initStore !== undefined) {
                initStoreValue = get(initStore);
            }
        }

        return readable<T | undefined>(initStoreValue, (set) => {
            const storeByKey = this.getStore(key);

            let unsubscribeDeepStore: Unsubscriber | undefined;
            const unsubscribe = storeByKey.subscribe((newMapValue) => {
                if (unsubscribeDeepStore) {
                    unsubscribeDeepStore();
                    unsubscribeDeepStore = undefined;
                }
                if (newMapValue === undefined) {
                    set(undefined);
                } else {
                    const deepValueStore = accessor(newMapValue);
                    if (deepValueStore !== undefined) {
                        set(get(deepValueStore));

                        unsubscribeDeepStore = deepValueStore.subscribe((value) => {
                            set(value);
                        });
                    }
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

    /**
     * Builds a store by "reducing" stores in keys.
     *
     * An example of a store containing the SUM of all values stored into the field "mySubStore":
     *
     * this.getAggregatedStore(
     *   (value) => value.mySubStore, // Accessor to access the sub stores
     *   (subStores) => subStores.reduce((partialSum, a) => partialSum + a, 0)) // Reduces the value
     *
     * @param accessor
     * @param reducer
     */
    getAggregatedStore<T, U>(
        accessor: (value: V) => Readable<T> | undefined,
        reducer: (stores: T[]) => U
    ): Readable<U | undefined> {
        const initArray = new Array<T>();

        for (const [, value] of this.entries()) {
            const store = accessor(value);
            if (store) {
                initArray.push(get(store));
            }
        }

        const initStoreValue = reducer(initArray);

        let unsubscriber: Unsubscriber | undefined;
        let derivedUnsubscriber: Unsubscriber | undefined;

        return readable(initStoreValue, (set) => {
            const globalUnsubscriber = this.subscribe((map) => {
                if (unsubscriber) {
                    unsubscriber();
                }
                const stores: Array<Readable<T>> = [];
                for (const value of this.values()) {
                    const store = accessor(value);
                    if (store) {
                        stores.push(store);
                    }
                }
                const derivedStore = derived(stores, reducer);
                if (derivedUnsubscriber) {
                    derivedUnsubscriber();
                }
                derivedUnsubscriber = derivedStore.subscribe((value) => {
                    set(value);
                });
            });

            return () => {
                globalUnsubscriber();
                if (unsubscriber) {
                    unsubscriber();
                }
                if (derivedUnsubscriber) {
                    derivedUnsubscriber();
                }
            };
        });
    }
}
