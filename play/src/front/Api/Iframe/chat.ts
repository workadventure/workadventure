import { Subject, Subscription } from "rxjs";
import type { UserInputChatEvent } from "../Events/UserInputChatEvent";
import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";

const chatStream = new Subject<string>();

export class WorkadventureChatCommands extends IframeApiContribution<WorkadventureChatCommands> {
    callbacks = [
        apiCallback({
            callback: (event: UserInputChatEvent) => {
                chatStream.next(event.message);
            },
            type: "userInputChat",
        }),
    ];

    /**
     * Open instantly the chat window.
     * {@link https://workadventu.re/map-building/api-chat.md#open-the-chat-window | Website documentation}
     */
    open(): void {
        sendToWorkadventure({ type: "openChat", data: undefined });
    }

    /**
     * Close instantly the chat window.
     * {@link https://workadventu.re/map-building/api-chat.md#close-the-chat-window | Website documentation}
     */
    close(): void {
        sendToWorkadventure({ type: "closeChat", data: undefined });
    }

    /**
     * Sends a message in the chat. The message is only visible in the browser of the current user.
     * {@link https://workadventu.re/map-building/api-chat.md#sending-a-message-in-the-chat | Website documentation}
     *
     * @param {string} message Message to be displayed in the chat
     * @param {string|undefined} author Name displayed for the author of the message. It does not have to be a real user
     */
    sendChatMessage(message: string, author?: string): void {
        sendToWorkadventure({
            type: "chat",
            data: {
                message: message,
                author: author ?? "System",
            },
        });
    }

    /**
     * Listens to messages typed by the current user and calls the callback. Messages from other users in the chat cannot be listened to.
     * {@link https://workadventu.re/map-building/api-chat.md#listening-to-messages-from-the-chat | Website documentation}
     *
     * @param {function(string): void} callback Function that will be called when a message is received. It contains the message typed by the user
     * @return {Subscription} Subscription to the chat message. Call ".unsubscribe()" to stop listening to the chat.
     */
    onChatMessage(callback: (message: string) => void): Subscription {
        return chatStream.subscribe(callback);
    }
}

export default new WorkadventureChatCommands();
