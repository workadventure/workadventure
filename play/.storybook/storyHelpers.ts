/**
 * Helpers for story-ising components that are coupled to Svelte stores.
 *
 * Most `play/` components read a writable store rather than taking everything as props.
 * Rather than refactor them, a story can set the store it depends on for the duration of the
 * story and restore it afterwards, keeping stories isolated from one another.
 */

/**
 * `beforeEach` factory for a store-coupled story.
 *
 * Sets the store (via its setter) to `value` before the story renders, and restores `restore`
 * once the story is torn down. Works with plain writables (`store.set`) and with stores that
 * expose a named setter (e.g. `duplicateUserConnectedStore.setDuplicateConnected`), since it
 * only needs the setter function.
 *
 * @example
 * defineMeta({
 *     component: DuplicateUserConnectedModal,
 *     beforeEach: withStore(duplicateUserConnectedStore.setDuplicateConnected, true, false),
 * });
 */
export function withStore<T>(set: (value: T) => void, value: T, restore: T): () => () => void {
    return () => {
        set(value);
        return () => set(restore);
    };
}

/**
 * Composes several `withStore` (or any `beforeEach`) setups into a single `beforeEach`. Each
 * setup is applied before the story renders; their cleanups run in reverse on teardown. Use it
 * for components that read more than one store.
 *
 * @example
 * defineMeta({
 *     component: WarningBanner,
 *     beforeEach: withStores([
 *         withStore(bannerStore.set, banner, null),
 *         withStore(warningBannerStore.set, true, false),
 *     ]),
 * });
 */
export function withStores(setups: Array<() => (() => void) | void>): () => () => void {
    return () => {
        const cleanups = setups.map((setup) => setup());
        return () => {
            for (const cleanup of cleanups.reverse()) {
                cleanup?.();
            }
        };
    };
}
