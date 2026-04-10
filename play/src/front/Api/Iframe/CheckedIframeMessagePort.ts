import type { z } from "zod";
import type { Observable } from "rxjs";
import { Subject } from "rxjs";
import type {
    IframeMessagePortMap,
    MessagePortIframeEvent,
    MessagePortWorkAdventureEvent,
} from "../Events/MessagePortEvents";
import { iframeMessagePortTypeGuards } from "../Events/MessagePortEvents";

type MessagePortMessageEvent<K extends keyof IframeMessagePortMap> = MessageEvent<
    z.infer<MessagePortWorkAdventureEvent<K>["data"]>
>;

/**
 * A wrapper around a MessagePort that ensures the messages sent and received conform to a specific type.
 * This class is used on the iframe side to communicate with the main application.
 */
export class CheckedIframeMessagePort<K extends keyof IframeMessagePortMap> {
    private readonly port: MessagePort;
    private readonly _messages: Subject<MessagePortMessageEvent<K>> = new Subject<MessagePortMessageEvent<K>>();
    public readonly messages: Observable<MessagePortMessageEvent<K>> = this._messages.asObservable();

    constructor(port: MessagePort, private type: K) {
        this.port = port;

        this.port.onmessage = (event: MessageEvent) => {
            iframeMessagePortTypeGuards[this.type].workAdventureEvents.parse(event.data);
            this._messages.next(event as MessagePortMessageEvent<K>);
        };
    }

    postMessage(message: MessagePortIframeEvent<K>["data"]): void {
        this.port.postMessage(message);
    }

    close(): void {
        this._messages.complete();
        if (this.port) {
            this.port.close();
        }
    }
}
