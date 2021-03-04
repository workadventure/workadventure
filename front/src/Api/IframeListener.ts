import {Subject} from "rxjs";

interface ChatEvent {
    message: string,
    author: string
}

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

            // FIXME: this is WAAAAAAAY too sloppy as "any" let's us put anything in the message.

            if (event.data.type === 'chat') {
                this._chatStream.next(event.data.data);
            }

        }, false);
    }
}

export const iframeListener = new IframeListener();
