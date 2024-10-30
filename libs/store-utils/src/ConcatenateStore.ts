import type { Readable } from "svelte/store";
import { Subscriber, Unsubscriber, derived } from "svelte/store";
import { ForwardableStore } from "./ForwardableStore";

/**
 * A store built by concatenating the result of stores that return arrays of items
 */
export class ConcatenateStore<T> implements Readable<Array<T>> {
    private stores: Array<Readable<Array<T>>> = [];
    private store: ForwardableStore<Array<T>>;

    constructor() {
        this.store = new ForwardableStore([]);
    }

    addStore(store: Readable<Array<T>>): void {
        this.stores.push(store);
        this.updateDerived();
    }

    removeStore(store: Readable<Array<T>>): void {
        this.stores = this.stores.filter((myStore) => myStore !== store);
        this.updateDerived();
    }

    private updateDerived() {
        this.store.forward(
            derived(this.stores, ($values) => {
                const arr: T[] = [];
                for (const value of $values) {
                    arr.push(...value);
                }
                return arr;
            })
        );
    }

    subscribe(run: Subscriber<T[]>, invalidate?: (value?: T[]) => void): Unsubscriber {
        return this.store.subscribe(run, invalidate);
    }
}
