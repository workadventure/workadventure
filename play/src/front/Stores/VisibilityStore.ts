import { writable } from "svelte/store";

const onVisibilityChange = () => {
    visibilityStore.set(document.visibilityState === "visible");
    hiddenStore.set(document.visibilityState === "hidden");
};

/**
 * A store containing whether the current page is visible or not.
 */
export const visibilityStore = writable(document.visibilityState === "visible", function start(set) {
    document.addEventListener("visibilitychange", onVisibilityChange);

    return function stop() {
        document.removeEventListener("visibilitychange", onVisibilityChange);
    };
});

/**
 * A store containing whether the current page is hidden or not.
 */
export const hiddenStore = writable(document.visibilityState === "hidden");
