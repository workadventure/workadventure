import { readable } from "svelte/store";

/**
 * A store containing whether the current page has the focus or not.
 */
export const focusStore = readable(document.hasFocus(), function start(set) {
    // Create a blur event listener
    const onBlur = () => {
        set(false);
    };

    // Create a focus event listener
    const onFocus = () => {
        set(true);
    };

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return function stop() {
        window.removeEventListener("blur", onBlur);
        window.removeEventListener("focus", onFocus);
    };
});
