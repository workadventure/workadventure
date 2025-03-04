import type { Readable, Subscriber, Unsubscriber } from "svelte/store";
import { writable } from "svelte/store";
import { Subject } from "rxjs";

/**
 * Is it an array? Is it a map? Is it a Svelte store? This is all at once!
 *
 * The SearchableArrayStore is an array that is also a Svelte store (it will be updated each time the array is updated)
 * Furthermore, it is searchable in O(1)
 * In addition you can listen when a new item is pushed in the array
 */
export class SearchableArrayStore<K, V> extends Array<V> implements Readable<Array<V>> {
    private readonly store = writable(this);
    private readonly storesByKey = new Map<K, V>();
    private readonly _pushSubject = new Subject<V>();
    public readonly onPush = this._pushSubject.asObservable();

    constructor(private getKeyCallback: (item: V) => K) {
        super();
    }

    subscribe(run: Subscriber<Array<V>>, invalidate?: (value?: Array<V>) => void): Unsubscriber {
        return this.store.subscribe(run, invalidate);
    }

    clear() {
        super.splice(0, this.length);
        this.store.set(this);
        this.storesByKey.clear();
    }

    delete(key: K): boolean {
        const index = super.findIndex((item) => this.getKeyCallback(item) === key);
        if (index !== -1) {
            this.splice(index, 1);
            return true;
        }
        return false;
    }

    push(...items: V[]): number {
        const { newItems, updatedItems } = this.separateNewAndUpdatedItems(items);

        updatedItems.forEach((item) => this.update(item));

        const number = super.push(...newItems);

        for (const item of newItems) {
            this.storesByKey.set(this.getKeyCallback(item), item);
        }
        this.store.set(this);
        for (const item of newItems) {
            this._pushSubject.next(item);
        }
        return number;
    }

    unshift(...items: V[]): number {
        const { newItems, updatedItems } = this.separateNewAndUpdatedItems(items);

        updatedItems.forEach((item) => this.update(item));
        const number = super.unshift(...newItems);

        for (const item of newItems) {
            this.storesByKey.set(this.getKeyCallback(item), item);
        }
        this.store.set(this);
        return number;
    }

    reverse(): V[] {
        super.reverse();
        this.store.set(this);
        return this;
    }

    shift(): V | undefined {
        const item = super.shift();
        if (item) {
            this.storesByKey.delete(this.getKeyCallback(item));
        }
        this.store.set(this);
        return item;
    }

    pop(): V | undefined {
        const item = super.pop();
        if (item) {
            this.storesByKey.delete(this.getKeyCallback(item));
        }
        this.store.set(this);
        return item;
    }

    splice(start: number, deleteCount?: number): V[];
    splice(start: number, deleteCount: number, ...addItems: V[]): V[] {
        let removedItems: V[];
        if (deleteCount === undefined) {
            removedItems = super.splice(start);
        } else {
            removedItems = super.splice(start, deleteCount, ...addItems);
        }

        for (const item of removedItems) {
            this.storesByKey.delete(this.getKeyCallback(item));
        }
        for (const item of addItems) {
            this.storesByKey.set(this.getKeyCallback(item), item);
        }
        this.store.set(this);
        return removedItems;
    }

    get(key: K): V | undefined {
        return this.storesByKey.get(key);
    }

    has(key: K): boolean {
        return this.storesByKey.has(key);
    }

    getKeys(): IterableIterator<K> {
        return this.storesByKey.keys();
    }

    update(value: V) {
        this.storesByKey.set(this.getKeyCallback(value), value);
        const index = super.findIndex((item) => this.getKeyCallback(item) === this.getKeyCallback(value));

        this[index] = value;
        this.store.set(this);
    }

    private separateNewAndUpdatedItems(items: V[]): { newItems: V[]; updatedItems: V[] } {
        return items.reduce(
            (acc, currItem) => {
                if (this.storesByKey.has(this.getKeyCallback(currItem))) {
                    acc.updatedItems.push(currItem);
                } else {
                    acc.newItems.push(currItem);
                }

                return acc;
            },
            {
                newItems: [],
                updatedItems: [],
            } as {
                newItems: V[];
                updatedItems: V[];
            }
        );
    }
}
