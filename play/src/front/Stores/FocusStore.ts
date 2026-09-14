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

    // Safari on iOS does not fire "focus" when the user comes back from another app, it only fires
    // "visibilitychange". Without this, the page stays blurred forever and the user is stuck "away".
    const onVisibilityChange = () => {
        if (document.visibilityState === "visible") {
            set(true);
        }
    };

    // The listeners only exist while the store has subscribers, and the initial value dates back to the module
    // evaluation: read the current state rather than trust a value that may have been left behind.
    set(document.hasFocus());

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return function stop() {
        window.removeEventListener("blur", onBlur);
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onVisibilityChange);
    };
});
