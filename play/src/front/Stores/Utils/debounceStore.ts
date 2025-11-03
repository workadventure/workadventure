import { derived, Readable } from "svelte/store";

/**
 * Creates a derived store that delays the propagation of value changes.
 * If the store value changes again before the delay elapses, the timer resets and only the latest value is emitted after the delay.
 *
 * @param store - The source store to watch
 * @param delay - The delay in milliseconds before propagating the value
 * @returns A new store that emits the value after the specified delay
 */
export function debounceStore<T>(store: Readable<T>, delay: number): Readable<T> {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return derived(store, ($store, set) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            set($store);
        }, delay);
        return () => {
            if (timeout) clearTimeout(timeout);
        };
    });
}
