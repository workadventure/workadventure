import {ChatEvent, isChatEvent} from "./Api/Events/ChatEvent";
import {isIframeEventWrapper} from "./Api/Events/IframeEvent";
import {isUserInputChatEvent, UserInputChatEvent} from "./Api/Events/UserInputChatEvent";
import {Subject} from "rxjs";

interface WorkAdventureApi {
    sendChatMessage(message: string, author: string): void;
    onChatMessage(callback: (message: string) => void): void;
}

declare global {
    // eslint-disable-next-line no-var
    var WA: WorkAdventureApi
}

type ChatMessageCallback = (message: string) => void;

const userInputChatStream: Subject<UserInputChatEvent> = new Subject();


window.WA = {
    /**
     * Send a message in the chat.
     * Only the local user will receive this message.
     */
    sendChatMessage(message: string, author: string) {
        window.parent.postMessage({
            'type': 'chat',
            'data': {
                'message': message,
                'author': author
            } as ChatEvent
        }, '*');
    },
    /**
     * Listen to messages sent by the local user, in the chat.
     */
    onChatMessage(callback: ChatMessageCallback): void {
        userInputChatStream.subscribe((userInputChatEvent) => {
            callback(userInputChatEvent.message);
        });
    }
}

window.addEventListener('message', message => {
    if (message.source !== window.parent) {
        console.log('MESSAGE SKIPPED!!!')
        return; // Skip message in this event listener
    }

    const payload = message.data;
    if (isIframeEventWrapper(payload)) {
        if (payload.type === 'userInputChat' && isUserInputChatEvent(payload.data)) {
            userInputChatStream.next(payload.data);
        }
    }

    // ...
});
