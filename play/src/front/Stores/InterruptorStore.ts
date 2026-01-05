import type { Readable } from "svelte/store";
import { derived } from "svelte/store";

/**
 * Creates a derived store that outputs the value of the main store
 * when the switch store is true, and undefined when the switch store is false.
 */
export function deriveSwitchStore<S>(mainStore: Readable<S>, switchStore: Readable<boolean>): Readable<S | undefined> {
    return derived([mainStore, switchStore], ([$main, $interrupt]) => {
        return $interrupt ? $main : undefined;
    });
}
