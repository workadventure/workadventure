import { readable } from "svelte/store";

/**
 * A store containing whether the current page is visible or not.
 */
export const visibilityStore = readable(document.visibilityState === "visible", function start(set) {
    const onVisibilityChange = () => {
        set(document.visibilityState === "visible");
    };

    // Create a blur event listener
    const onBlur = () => {
        set(false);
    };

    // Create a focus event listener
    const onFocus = () => {
        set(true);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return function stop() {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("blur", onBlur);
        window.removeEventListener("focus", onFocus);
    };
});
