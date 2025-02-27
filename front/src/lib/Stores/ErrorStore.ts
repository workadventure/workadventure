import { derived, writable } from "svelte/store";
import { v4 as uuid } from "uuid";

interface ErrorMessage {
    id: string | undefined;
    closable: boolean; // Whether it can be closed by a user action or not
    message: string | number | boolean | undefined;
}

type WarningMessage = ErrorMessage;

/**
 * A store that contains a list of error messages to be displayed.
 */
function createErrorStore() {
    const { subscribe, update } = writable<ErrorMessage[]>([]);

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
                return messages.filter((message) => message.id !== id);
            });
        },
        clearClosableMessages: (): void => {
            update((messages: ErrorMessage[]) => {
                return messages.filter((message) => !message.closable);
            });
        },
    };
}

export const errorStore = createErrorStore();

export const hasClosableMessagesInErrorStore = derived(errorStore, ($errorStore) => {
    const closableMessage = $errorStore.find((errorMessage) => errorMessage.closable);
    return !!closableMessage;
});

function createWarningMessageStore() {
    const { subscribe, update } = writable<WarningMessage[]>([]);

    return {
        subscribe,
        addWarningMessage: (
            e: string | Error,
            options?: {
                closable?: boolean;
                id?: string;
            }
        ): void => {
            update((messages: WarningMessage[]) => {
                let message: string;
                if (e instanceof Error) {
                    message = e.message;
                } else {
                    message = e;
                }

                const newWarningMessage = {
                    message,
                    closable: options?.closable ?? true,
                    id: options?.id ?? uuid(),
                };
                if (
                    !messages.find(
                        (errorMessage) =>
                            errorMessage.message === newWarningMessage.message ||
                            (errorMessage.id != undefined &&
                                newWarningMessage.id != undefined &&
                                errorMessage.id === newWarningMessage.id)
                    )
                ) {
                    messages.push(newWarningMessage);

                    setTimeout(() => {
                        update((messages: WarningMessage[]) => {
                            return messages.filter((message) => message.id !== newWarningMessage.id);
                        });
                    }, 10000);
                }

                return messages;
            });
        },
    };
}
export const warningMessageStore = createWarningMessageStore();
