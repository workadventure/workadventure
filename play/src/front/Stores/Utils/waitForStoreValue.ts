import type { Readable } from "svelte/store";

export function waitForStoreValue<T>(store: Readable<T | undefined | null>): Promise<T> {
    return new Promise((resolve) => {
        let unsubscribe: (() => void) | undefined = undefined;
        let resolved = false;

        unsubscribe = store.subscribe((value) => {
            if (value !== undefined && value !== null) {
                resolved = true;
                resolve(value);
                unsubscribe?.();
            }
        });

        if (resolved) {
            unsubscribe?.();
        }
    });
}
