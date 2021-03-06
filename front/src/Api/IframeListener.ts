import {Subject} from "rxjs";
import {ChatEvent, isChatEvent} from "./Events/ChatEvent";
import {IframeEvent, isIframeEventWrapper} from "./Events/IframeEvent";
import {UserInputChatEvent} from "./Events/UserInputChatEvent";



/**
 * Listens to messages from iframes and turn those messages into easy to use observables.
 */
class IframeListener {
    private readonly _chatStream: Subject<ChatEvent> = new Subject();
    public readonly chatStream = this._chatStream.asObservable();

    init() {
        window.addEventListener("message", (message) => {
            // Do we trust the sender of this message?
            //if (message.origin !== "http://example.com:8080")
            //    return;

            // message.source is window.opener
            // message.data is the data sent by the iframe

            const payload = message.data;
            if (isIframeEventWrapper(payload)) {
                if (payload.type === 'chat' && isChatEvent(payload.data)) {
                    this._chatStream.next(payload.data);
                }
            }


        }, false);


    }

    sendUserInputChat(message: string) {
        this.postMessage({
            'type': 'userInputChat',
            'data': {
                'message': message,
            } as UserInputChatEvent
        });
    }

    /**
     * Sends the message... to absolutely all the iFrames that can be found in the current document.
     */
    private postMessage(message: IframeEvent) {
        // TODO: not the most effecient implementation if there are many events sent!
        for (const iframe of document.querySelectorAll<HTMLIFrameElement>('iframe')) {
            iframe.contentWindow?.postMessage(message, '*');
        }
    }
}

export const iframeListener = new IframeListener();
