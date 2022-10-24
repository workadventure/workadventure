import { writable } from "svelte/store";
import { v4 as uuidv4 } from "uuid";

export interface Message {
    id: string;
    text: string;
}

/**
 * A store that contains a list of messages to be displayed.
 */
export function createMessageStore() {
    const { subscribe, update } = writable<Message[]>([]);

    return {
        subscribe,
        addMessage: (text: string): void => {
            update((messages: Message[]) => {
                return [...messages, { id: uuidv4(), text }];
            });
        },
        clearMessageById: (id: string): void => {
            update((messages: Message[]) => {
                messages = messages.filter((message) => message.id !== id);
                return messages;
            });
        },
    };
}
