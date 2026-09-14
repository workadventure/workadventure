import { readable } from "svelte/store";

/**
 * A store containing whether the current page is visible or not.
 */
export const visibilityStore = readable(document.visibilityState === "visible", function start(set) {
    const onVisibilityChange = () => {
        set(document.visibilityState === "visible");
    };

    // The listener only exists while the store has subscribers, and the initial value dates back to the module
    // evaluation: any change in between was missed. Read the current state instead of trusting the stored one.
    onVisibilityChange();

    document.addEventListener("visibilitychange", onVisibilityChange);

    return function stop() {
        document.removeEventListener("visibilitychange", onVisibilityChange);
    };
});
