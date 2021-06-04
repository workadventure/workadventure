import {writable} from "svelte/store";

/**
 * A store that contains a list of error messages to be displayed.
 */
function createErrorStore() {
    const { subscribe, set, update } = writable<string[]>([]);

    return {
        subscribe,
        addErrorMessage: (e: string|Error): void => {
            update((messages: string[]) => {
                let message: string;
                if (e instanceof Error) {
                    message = e.message;
                } else {
                    message = e;
                }

                if (!messages.includes(message)) {
                    messages.push(message);
                }

                return messages;
            });
        },
        clearMessages: (): void => {
            set([]);
        }
    };
}

export const errorStore = createErrorStore();
