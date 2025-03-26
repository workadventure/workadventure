import { Subject, Subscription } from "rxjs";
import { SendChatMessageOptions, ChatMessageTypes } from "@workadventure/shared-utils";
import type { UserInputChatEvent } from "../Events/UserInputChatEvent";
import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";
import { RemotePlayerInterface } from "./Players/RemotePlayer";
import players from "./players";
import { PublicPlayerState } from "./PublicPlayerState";

const chatStream = new Subject<UserInputChatEvent>();

export interface OnChatMessageOptions {
    scope: "local" | "bubble";
}

export class WorkadventureChatCommands<PublicState extends { [key: string]: unknown }> extends IframeApiContribution<
    WorkadventureChatCommands<PublicState>
> {
    callbacks = [
        apiCallback({
            callback: (event: UserInputChatEvent) => {
                chatStream.next(event);
            },
            type: "userInputChat",
        }),
    ];

    /**
     * Open instantly the chat window.
     * {@link https://docs.workadventu.re/map-building/api-chat.md#open-the-chat-window | Website documentation}
     */
    open(): void {
        sendToWorkadventure({ type: "openChat", data: undefined });
    }

    /**
     * Close instantly the chat window.
     * {@link https://docs.workadventu.re/map-building/api-chat.md#close-the-chat-window | Website documentation}
     */
    close(): void {
        sendToWorkadventure({ type: "closeChat", data: undefined });
    }

    /**
     * Sends a message in the chat.
     * {@link https://docs.workadventu.re/developer/map-scripting/references/api-chat#sending-a-message-in-the-chat | Website documentation}
     *
     * @param {string} message Message to be displayed in the chat
     * @param {SendChatMessageOptions|string|undefined} options Decides if the message is sent only to the local users or to all users in the bubble. In undefined, the message is sent to the local user only. If the message is sent locally, you can decide an "author" name to be displayed in the chat. It does not have to be a real user. If a string is passed instead of an object, it will be used as the Name displayed for the author of the message (and the message type will automatically by "local"). Using a string instead of an object is deprecated.
     */
    sendChatMessage(message: string, options?: string | SendChatMessageOptions): void {
        if (typeof options === "string") {
            options = {
                scope: "local",
                author: options,
            };
        } else if (options === undefined) {
            options = {
                scope: "local",
            };
        }
        sendToWorkadventure({
            type: "chat",
            data: {
                message,
                options,
            },
        });
    }

    /**
     * Simulates a user is currently typing a message in the chat.
     *
     * If the scope is "bubble", the typing indicator will be displayed in the chat of all users in the bubble (except the current user)
     * If the scope is "local", the typing indicator will be displayed in the chat of the current user only (and will appear to come from the user whose name is "author")
     *
     * @param options
     */
    startTyping(options: SendChatMessageOptions): void {
        if (options.scope === "bubble") {
            sendToWorkadventure({
                type: "newChatMessageWritingStatus",
                data: ChatMessageTypes.userWriting,
            });
        } else {
            sendToWorkadventure({
                type: "startWriting",
                data: {
                    author: options.author,
                },
            });
        }
    }

    /**
     * Simulates a user has stopped typing a message in the chat.
     *
     * If the scope is "bubble", the typing indicator will be removed in the chat of all users in the bubble (except the current user)
     * If the scope is "local", the typing indicator will be removed in the chat of the current user only (and will appear to come from the user whose name is "author")
     *
     * @param options
     */
    stopTyping(options: SendChatMessageOptions): void {
        if (options.scope === "bubble") {
            sendToWorkadventure({
                type: "newChatMessageWritingStatus",
                data: ChatMessageTypes.userStopWriting,
            });
        } else {
            sendToWorkadventure({
                type: "stopWriting",
                data: {
                    author: options.author,
                },
            });
        }
    }

    /**
     * Listens to messages typed in the chat history.
     * {@link https://docs.workadventu.re/map-building/api-chat.md#listening-to-messages-from-the-chat | Website documentation}
     *
     * @param {function(message: string, event: { authorId: number|undefined, author: RemotePlayerInterface|undefined }): void} callback Function that will be called when a message is received. It contains the message typed by the user
     * @param {OnChatMessageOptions} options Options to decide if we listen only to messages from the local user (default) or from all users in the bubble.
     * @return {Subscription} Subscription to the chat message. Call ".unsubscribe()" to stop listening to the chat.
     */
    onChatMessage(
        callback: (
            message: string,
            event: { authorId: number | undefined; author: RemotePlayerInterface | undefined }
        ) => void,
        options?: OnChatMessageOptions
    ): Subscription {
        const finalOptions = options ?? { scope: "local" };

        return chatStream.subscribe((event) => {
            if (
                (finalOptions.scope === "local" && event.senderId !== undefined) ||
                (finalOptions.scope === "bubble" && event.senderId === undefined)
            ) {
                return;
            }
            // The senderId is the spaceUserId of the user, i.e. roomID_userID
            // Let's extract the user ID and room ID from it
            const senderId = event.senderId;
            let roomId: string | undefined;
            let userId: number | undefined;
            if (senderId !== undefined) {
                const lastUnderscoreIndex = senderId.lastIndexOf("_");
                if (lastUnderscoreIndex !== undefined && lastUnderscoreIndex !== -1) {
                    roomId = senderId.substring(0, lastUnderscoreIndex);
                    userId = Number(senderId.substring(lastUnderscoreIndex + 1));
                }
            }

            callback(event.message, {
                authorId: userId,
                author: userId && roomId === WA.room.id ? players.get(userId) : undefined,
            });
        });
    }
}

export default new WorkadventureChatCommands<PublicPlayerState>();
