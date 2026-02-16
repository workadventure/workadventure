import { readable } from "svelte/store";

/**
 * A store containing whether the current page is visible or not.
 */
export const visibilityStore = readable(true, function start(set) {
    // visibilitychange and document.hidden is not working as expected, so we use blur and focus events instead
    // For example if the user open a new browser behind the current one, the visibilitychange event will not be triggered.
    // So in this case, only the blur and focus events will be triggered.
    /*const onVisibilityChange = () => {
        set(document.visibilityState === "visible" && !document.hidden);
    };*/

    // Create a blur event listener
    const onBlur = () => {
        set(false);
    };

    // Create a focus event listener
    const onFocus = () => {
        set(true);
    };

    //document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return function stop() {
        //document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("blur", onBlur);
        window.removeEventListener("focus", onFocus);
    };
});
