import type { Readable } from "svelte/store";
import { Subscriber, Unsubscriber, writable, Writable } from "svelte/store";

export class ForwardableStore<T> implements Readable<T> {
    private store: Writable<T>;
    private innerStoreUnsubscriber: Unsubscriber | undefined;

    constructor(initialValue: T) {
        this.store = writable(initialValue);
    }

    forward(store: Readable<T>): void {
        if (this.innerStoreUnsubscriber) {
            this.innerStoreUnsubscriber();
        }
        this.innerStoreUnsubscriber = store.subscribe((value) => {
            this.store.set(value);
        });
    }

    subscribe(run: Subscriber<T>, invalidate?: (value?: T) => void): Unsubscriber {
        return this.store.subscribe(run, invalidate);
    }
}
