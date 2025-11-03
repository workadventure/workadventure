import { type Readable } from "svelte/store";

/**
 * Waits for a store to emit a truthy value and returns it as a Promise.
 *
 * @param store - A Svelte store that may contain undefined, null, or a value of type T
 * @returns A Promise that resolves with the first truthy value emitted by the store
 */
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
