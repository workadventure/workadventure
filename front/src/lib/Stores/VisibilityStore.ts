import { readable } from "svelte/store";

/**
 * A store containing whether the current page is visible or not.
 */
export const visibilityStore = readable(document.visibilityState === "visible", function start(set) {
    const onVisibilityChange = () => {
        set(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return function stop() {
        document.removeEventListener("visibilitychange", onVisibilityChange);
    };
});
