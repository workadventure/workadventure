import { readable } from "svelte/store";

/**
 * A store containing whether the current page has the focus or not.
 */
export const focusStore = readable(document.hasFocus(), function start(set) {
    // The browser fires "focus" / "blur" synchronously when Svelte removes the focused element (e.g. an iframe)
    // while it is rendering. Setting the store at that moment throws "state_unsafe_mutation", so we defer it.
    // Both listeners are deferred so that their order is kept.
    const onBlur = () => {
        queueMicrotask(() => set(false));
    };

    const onFocus = () => {
        queueMicrotask(() => set(true));
    };

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return function stop() {
        window.removeEventListener("blur", onBlur);
        window.removeEventListener("focus", onFocus);
    };
});
