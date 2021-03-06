import {Subject} from "rxjs";
import {ChatEvent, isChatEvent} from "./Events/ChatEvent";
import {IframeEvent, isIframeEventWrapper} from "./Events/IframeEvent";
import {UserInputChatEvent} from "./Events/UserInputChatEvent";



/**
 * Listens to messages from iframes and turn those messages into easy to use observables.
 * Also allows to send messages to those iframes.
 */
class IframeListener {
    private readonly _chatStream: Subject<ChatEvent> = new Subject();
    public readonly chatStream = this._chatStream.asObservable();

    private readonly iframes = new Set<HTMLIFrameElement>();

    init() {
        window.addEventListener("message", (message) => {
            // Do we trust the sender of this message?
            // Let's only accept messages from the iframe that are allowed.
            // Note: maybe we could restrict on the domain too for additional security (in case the iframe goes to another domain).
            let found = false;
            for (const iframe of this.iframes) {
                if (iframe.contentWindow === message.source) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                return;
            }

            const payload = message.data;
            if (isIframeEventWrapper(payload)) {
                if (payload.type === 'chat' && isChatEvent(payload.data)) {
                    this._chatStream.next(payload.data);
                }
            }


        }, false);

    }

    /**
     * Allows the passed iFrame to send/receive messages via the API.
     */
    registerIframe(iframe: HTMLIFrameElement): void {
        this.iframes.add(iframe);
    }

    unregisterIframe(iframe: HTMLIFrameElement): void {
        this.iframes.delete(iframe);
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
     * Sends the message... to all allowed iframes.
     */
    private postMessage(message: IframeEvent) {
        for (const iframe of this.iframes) {
            iframe.contentWindow?.postMessage(message, '*');
        }
    }
}

export const iframeListener = new IframeListener();
