import {writable} from "svelte/store";
import {WAError} from "../Phaser/Reconnecting/WAError";

/**
 * A store that contains one error of type WAError to be displayed.
 */
function createErrorScreenStore() {
    const { subscribe, set } = writable<WAError>(undefined);

    return {
        subscribe,
        setError: (
            e: WAError
        ): void => set(e),
    };
}

export const errorScreenStore = createErrorScreenStore();
