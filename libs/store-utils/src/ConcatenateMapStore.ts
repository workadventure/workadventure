import type { Readable } from "svelte/store";
import { Subscriber, Unsubscriber, derived } from "svelte/store";
import { ForwardableStore } from "./ForwardableStore";

/**
 * A store built by concatenating the result of stores that return maps of items
 */
export class ConcatenateMapStore<K, V> implements Readable<Map<K, V>> {
    private stores: Array<Readable<Map<K, V>>> = [];
    private store: ForwardableStore<Map<K, V>>;

    constructor() {
        this.store = new ForwardableStore(new Map<K, V>());
    }

    addStore(store: Readable<Map<K, V>>): void {
        this.stores.push(store);
        this.updateDerived();
    }

    removeStore(store: Readable<Map<K, V>>): void {
        this.stores = this.stores.filter((myStore) => myStore !== store);
        this.updateDerived();
    }

    private updateDerived() {
        this.store.forward(
            derived(this.stores, ($values) => {
                const concatenatedMap: Map<K, V> = new Map();

                for (const map of $values) {
                    for (const [key, value] of map) {
                        if (concatenatedMap.has(key)) {
                            console.warn(
                                `ConcatenateMapStore: key ${key as unknown as string} is already present in the map.`
                            );
                        }
                        concatenatedMap.set(key, value);
                    }
                }

                return concatenatedMap;
            })
        );
    }

    subscribe(run: Subscriber<Map<K, V>>, invalidate?: (value?: Map<K, V>) => void): Unsubscriber {
        return this.store.subscribe(run, invalidate);
    }
}
