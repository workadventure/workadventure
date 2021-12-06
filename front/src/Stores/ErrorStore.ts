import { derived, writable } from "svelte/store";

interface ErrorMessage {
    id: string | undefined;
    closable: boolean; // Whether it can be closed by a user action or not
    message: string | number | boolean | undefined;
}

/**
 * A store that contains a list of error messages to be displayed.
 */
function createErrorStore() {
    const { subscribe, set, update } = writable<ErrorMessage[]>([]);

    return {
        subscribe,
        addErrorMessage: (
            e: string | Error,
            options?: {
                closable?: boolean;
                id?: string;
            }
        ): void => {
            update((messages: ErrorMessage[]) => {
                let message: string;
                if (e instanceof Error) {
                    message = e.message;
                } else {
                    message = e;
                }

                if (!messages.find((errorMessage) => errorMessage.message === message)) {
                    messages.push({
                        message,
                        closable: options?.closable ?? true,
                        id: options?.id,
                    });
                }

                return messages;
            });
        },
        clearMessageById: (id: string): void => {
            update((messages: ErrorMessage[]) => {
                messages = messages.filter((message) => message.id !== id);
                return messages;
            });
        },
        clearClosableMessages: (): void => {
            update((messages: ErrorMessage[]) => {
                messages = messages.filter((message) => message.closable);
                return messages;
            });
        },
    };
}

export const errorStore = createErrorStore();

export const hasClosableMessagesInErrorStore = derived(errorStore, ($errorStore) => {
    const closableMessage = $errorStore.find((errorMessage) => errorMessage.closable);
    return !!closableMessage;
});
