import type { Readable, Subscriber, Unsubscriber, Writable } from "svelte/store";
import { get, readable, writable } from "svelte/store";


export class SearchableArrayStore<K, V> extends Array<V> implements Readable<Array<V>> {
    private readonly store = writable(this);
    private readonly storesByKey = new Map<K, Writable<V | undefined>>();

    subscribe(run: Subscriber<Array<V>>, invalidate?: (value?: Array<V>) => void): Unsubscriber {
        return this.store.subscribe(run, invalidate);
    }

    append(key: K, value: V): this {
        super.push(value);
        this.add(key, value);
        return this;
    }

    prepend(key: K, value: V): this {
        super.unshift(value);
        this.add(key, value);
        return this;
    }

    private add(key: K, value: V): void {
        this.store.set(this);
        this.storesByKey.set(key, writable(value));
    }

    clear() {
        super.splice(0, this.length);
        this.store.set(this);
        this.storesByKey.forEach((store) => {
            store.set(undefined);
        });
        this.storesByKey.clear();
    }

    delete(key: K): boolean {
        const value = this.storesByKey.get(key);
        if (value) {
            super.filter(_value => _value === value);
            this.store.set(this);
            this.storesByKey.get(key)?.set(undefined);
        }
        return !!value;
    }


    getStore(key: K): Readable<V | undefined> {
        const foundStore = this.storesByKey.get(key);
        if(foundStore) {
            return readable(get(foundStore));
        }
        return readable(undefined);
    }
}