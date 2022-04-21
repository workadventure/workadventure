import { writable } from "svelte/store";
import { ErrorScreenMessage } from "../Messages/ts-proto-generated/protos/messages";

/**
 * A store that contains one error of type WAError to be displayed.
 */
function createErrorScreenStore() {
    const { subscribe, set } = writable<ErrorScreenMessage>(undefined);

    return {
        subscribe,
        setError: (e: ErrorScreenMessage): void => {
            set(e)
        },
    };
}

export const errorScreenStore = createErrorScreenStore();
