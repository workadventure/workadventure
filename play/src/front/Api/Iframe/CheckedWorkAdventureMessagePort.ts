import type { z } from "zod";
import type { Observable } from "rxjs";
import { Subject } from "rxjs";
import type {
    IframeMessagePortMap,
    MessagePortIframeEvent,
    MessagePortWorkAdventureEvent,
} from "../Events/MessagePortEvents";
import { iframeMessagePortTypeGuards } from "../Events/MessagePortEvents";

type MessagePortMessageEvent<K extends keyof IframeMessagePortMap> = MessageEvent<MessagePortIframeEvent<K>["data"]>;

interface CheckedWorkAdventureMessagePortInterface<K extends keyof IframeMessagePortMap> {
    readonly messages: Observable<MessagePortMessageEvent<K>>;
    readonly closeEvent: Observable<void>;

    postMessage(message: z.infer<MessagePortWorkAdventureEvent<K>["data"]>): void;
    close(): void;
}

/**
 * A wrapper around a MessagePort that ensures the messages sent and received conform to a specific type.
 * This class is used on the WorkAdventure side to communicate with the iframes.
 */
export class CheckedWorkAdventureMessagePort<K extends keyof IframeMessagePortMap>
    implements CheckedWorkAdventureMessagePortInterface<K>
{
    private readonly port: MessagePort;
    private readonly _messages: Subject<MessagePortMessageEvent<K>> = new Subject<MessagePortMessageEvent<K>>();
    public readonly messages: Observable<MessagePortMessageEvent<K>> = this._messages.asObservable();
    private readonly _closeEvent: Subject<void> = new Subject<void>();
    public readonly closeEvent: Observable<void> = this._closeEvent.asObservable();

    constructor(port: MessagePort, private type: K) {
        this.port = port;

        this.port.onmessage = (event: MessageEvent) => {
            iframeMessagePortTypeGuards[this.type].iframeEvents.parse(event.data);
            this._messages.next(event as MessagePortMessageEvent<K>);
        };
    }

    postMessage(message: z.infer<MessagePortWorkAdventureEvent<K>["data"]>): void {
        this.port.postMessage(message);
    }

    onCloseIframe(): void {
        this._closeEvent.next();
        this.close();
    }

    close(): void {
        this._messages.complete();
        this._closeEvent.complete();
        if (this.port) {
            this.port.close();
        }
    }
}
