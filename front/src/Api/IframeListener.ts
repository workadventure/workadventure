import {Subject} from "rxjs";
import {ChatEvent, isChatEvent} from "./Events/ChatEvent";
import {isIframeEventWrapper} from "./Events/IframeEvent";



/**
 * Listens to messages from iframes and turn those messages into easy to use observables.
 */
class IframeListener {
    private readonly _chatStream: Subject<ChatEvent> = new Subject();
    public readonly chatStream = this._chatStream.asObservable();

    init() {
        window.addEventListener("message", (event) => {
            // Do we trust the sender of this message?
            //if (event.origin !== "http://example.com:8080")
            //    return;

            // event.source is window.opener
            // event.data is the data sent by the iframe

            const payload = event.data;
            if (isIframeEventWrapper(payload)) {
                if (payload.type === 'chat' && isChatEvent(payload.data)) {
                    this._chatStream.next(payload.data);
                }
            }


        }, false);
    }
}

export const iframeListener = new IframeListener();
