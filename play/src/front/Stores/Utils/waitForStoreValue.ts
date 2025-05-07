import { type Readable } from "svelte/store";

export function waitForStoreValue<T>(store: Readable<T | undefined | null>): Promise<T> {
    return new Promise((resolve) => {
        const unsubscribe = store.subscribe((value) => {
            if (value) {
                resolve(value);
                unsubscribe();
            }
        });
    });
}
