import { UserInputChatEvent } from "../Events/UserInputChatEvent";
import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";
import { Subject } from "rxjs";

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

    sendChatMessage(message: string, author: string) {
        sendToWorkadventure({
            type: "chat",
            data: {
                message: message,
                author: author,
            },
        });
    }

    /**
     * Listen to messages sent by the local user, in the chat.
     */
    onChatMessage(callback: (message: string) => void) {
        chatStream.subscribe(callback);
    }

    open(): void {
        sendToWorkadventure({ type: "openChat", data: undefined });
    }

    close(): void {
        sendToWorkadventure({ type: "closeChat", data: undefined });
    }
}

export default new WorkadventureChatCommands();
