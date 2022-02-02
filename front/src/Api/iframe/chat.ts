import { isUserInputChatEvent, UserInputChatEvent } from "../Events/UserInputChatEvent";
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
            typeChecker: isUserInputChatEvent,
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
}

export default new WorkadventureChatCommands();
