import { writable } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import type { SendUserMessage } from "@workadventure/messages";

export interface Message {
    id: string;
    /** The Quill delta of the announcement, as JSON. */
    text: string;
    /** Empty for a message sent through the admin API. */
    senderName: string;
    senderTextures: SendUserMessage["senderTextures"];
    broadcastToWorld: boolean;
    /** "<room URL>#moveTo=<area>" on this origin, or "". */
    joinUrl: string;
    receivedAt: Date;
}

/**
 * A store that contains a list of messages to be displayed.
 */
export function createMessageStore() {
    const { subscribe, update } = writable<Message[]>([]);

    return {
        subscribe,
        addMessage: ({ message, senderName, senderTextures, broadcastToWorld, joinUrl }: SendUserMessage): void => {
            update((messages: Message[]) => {
                return [
                    ...messages,
                    {
                        id: uuidv4(),
                        text: message,
                        senderName,
                        senderTextures,
                        broadcastToWorld,
                        joinUrl,
                        receivedAt: new Date(),
                    },
                ];
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
