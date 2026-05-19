import {
    FrontToPusherWebSocketMessage,
    PusherToFrontWebSocketMessage,
    type ClientToServerMessage,
    type ServerToClientMessage,
} from "@workadventure/messages";
import { BehaviorSubject } from "rxjs";
import { NoncedMessageStore } from "../../common/NoncedMessageStore";
import { CLIENT_DISCONNECTION_RETENTION_MS } from "../Enum/EnvironmentVariable";

type WebSocketFactory = (url: string, protocols?: string[]) => WebSocket;

export class WorkAdventureWebSocket {
    private static websocketFactory: WebSocketFactory | null = null;
    private static nextConnectionId = 1;

    public static setWebsocketFactory(websocketFactory: WebSocketFactory | null): void {
        WorkAdventureWebSocket.websocketFactory = websocketFactory;
    }

    public onopen: ((this: WorkAdventureWebSocket, ev: Event) => void) | null = null;
    public onclose: ((this: WorkAdventureWebSocket, ev: CloseEvent) => void) | null = null;
    public onerror: ((this: WorkAdventureWebSocket, ev: Event) => void) | null = null;
    public onmessage: ((this: WorkAdventureWebSocket, ev: MessageEvent<ServerToClientMessage>) => void) | null = null;

    private readonly _reconnectingStream = new BehaviorSubject<boolean>(false);
    public readonly reconnectingStream = this._reconnectingStream.asObservable();

    private readonly url: URL;
    private readonly protocols: string[] | undefined;
    private manuallyClosed = false;
    private reconnectAttempted = false;
    private reconnectAttempt = 0;
    private readonly connectionId = WorkAdventureWebSocket.nextConnectionId++;
    private nextOutgoingNonce = 1;
    private lastReceivedNonce = 0;
    private readonly outgoingMessagesStore = new NoncedMessageStore<Uint8Array<ArrayBuffer>>(
        CLIENT_DISCONNECTION_RETENTION_MS
    );

    private socket: WebSocket;

    public constructor(url: string | URL, protocols?: string[]) {
        this.url = new URL(url);
        this.protocols = protocols;
        this.logLifecycle("constructor", {
            url: this.url.toString(),
            retentionMs: CLIENT_DISCONNECTION_RETENTION_MS,
        });
        this.socket = this.createSocket();
    }

    public isOpen(): boolean {
        return this.socket.readyState === WebSocket.OPEN;
    }

    public send(message: ClientToServerMessage): void {
        const nonce = this.nextOutgoingNonce;
        const payloadWithNonce = FrontToPusherWebSocketMessage.encode({
            nonce,
            message,
        }).finish();
        this.nextOutgoingNonce += 1;
        this.outgoingMessagesStore.add(nonce, payloadWithNonce);

        this.logLifecycleDebug("send", {
            nonce,
            messageType: message.message?.$case,
            readyState: this.socket.readyState,
            bufferedMessages: this.outgoingMessagesStore.getAll().length,
        });
        this.socket.send(payloadWithNonce);
    }

    public getLastReceivedNonce(): number {
        return this.lastReceivedNonce;
    }

    public close(code?: number, reason?: string): void {
        this.logLifecycle("manual close requested", {
            code,
            reason,
            readyState: this.socket.readyState,
        });
        this.manuallyClosed = true;
        this.detachSocketListeners(this.socket);
        this._reconnectingStream.next(false);
        this._reconnectingStream.complete();
        this.socket.close(code, reason);
    }

    private handleOpenEvent = (): void => {
        const isReconnection = this.reconnectAttempted;
        this.logLifecycle("open", {
            isReconnection,
            reconnectAttempt: this.reconnectAttempt,
            lastReceivedNonce: this.lastReceivedNonce,
            bufferedMessages: this.outgoingMessagesStore.getAll().length,
        });
        this.reconnectAttempted = false;
        if (isReconnection) {
            const messagesToReplay = this.outgoingMessagesStore.getAll();
            this.logLifecycle("replay buffered client messages", {
                count: messagesToReplay.length,
                oldestNonce: messagesToReplay[0]?.nonce,
                newestNonce: messagesToReplay[messagesToReplay.length - 1]?.nonce,
            });
            for (const { nonce, payload } of messagesToReplay) {
                this.logLifecycleDebug("replay client message", { nonce });
                this.socket.send(payload);
            }
            this._reconnectingStream.next(false);
        }
        const event = new Event("open");
        this.onopen?.call(this, event);
    };

    private handleCloseEvent = (event: CloseEvent): void => {
        this.logLifecycle("close event", {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            manuallyClosed: this.manuallyClosed,
            reconnectAttempted: this.reconnectAttempted,
            lastReceivedNonce: this.lastReceivedNonce,
            bufferedMessages: this.outgoingMessagesStore.getAll().length,
        });
        this.detachSocketListeners(this.socket);

        if (!this.manuallyClosed && this.shouldReconnect(event)) {
            this.reconnectAttempted = true;
            this.reconnectAttempt += 1;
            this.logLifecycle("starting reconnect", {
                reconnectAttempt: this.reconnectAttempt,
                lastReceivedNonce: this.lastReceivedNonce,
            });
            this._reconnectingStream.next(true);
            this.socket = this.createSocket();
            return;
        }

        this.logLifecycle("close propagated to room connection", {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
        });
        this._reconnectingStream.next(false);
        const closeEvent = new CloseEvent("close", {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
        });
        this.onclose?.call(this, closeEvent);
        this._reconnectingStream.complete();
    };

    private handleErrorEvent = (event: Event): void => {
        this.logLifecycle("error event", {
            type: event.type,
            readyState: this.socket.readyState,
        });
        this.onerror?.call(this, event);
    };

    private handleMessageEvent = (event: MessageEvent): void => {
        const bytes =
            event.data instanceof ArrayBuffer
                ? new Uint8Array(event.data)
                : new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);

        let frame;
        try {
            frame = PusherToFrontWebSocketMessage.decode(bytes);
        } catch (e) {
            this.logLifecycle("invalid incoming frame", { error: e });
            console.error(e);
            this.close(1003, "Invalid message format");
            return;
        }

        this.lastReceivedNonce = frame.nonce;
        const messageEvent = new MessageEvent<ServerToClientMessage>("message", {
            data: frame.message,
            origin: event.origin,
            lastEventId: event.lastEventId,
            ports: [...event.ports],
            source: event.source,
        });

        this.logLifecycleDebug("received", {
            nonce: frame.nonce,
            messageType: messageEvent.data.message?.$case,
        });

        this.onmessage?.call(this, messageEvent);
    };

    private createSocket(): WebSocket {
        const socketUrl = new URL(this.url.toString());
        if (this.reconnectAttempted) {
            socketUrl.searchParams.set("lastReceivedNonce", this.lastReceivedNonce.toString());
        }

        this.logLifecycle("creating websocket transport", {
            url: socketUrl.toString(),
            reconnectAttempt: this.reconnectAttempt,
            lastReceivedNonce: this.reconnectAttempted ? this.lastReceivedNonce : undefined,
        });
        const socket = WorkAdventureWebSocket.websocketFactory
            ? WorkAdventureWebSocket.websocketFactory(socketUrl.toString(), this.protocols)
            : new WebSocket(socketUrl, this.protocols);
        socket.binaryType = "arraybuffer";

        this.bindSocketListeners(socket);
        return socket;
    }

    private shouldReconnect(event: CloseEvent): boolean {
        if (this.reconnectAttempted) {
            this.logLifecycle("reconnect refused", {
                reason: "already attempted",
                code: event.code,
            });
            return false;
        }
        // Do not reconnect if handshake/auth was refused.
        if (event.code === 1000 || event.code === 1008) {
            this.logLifecycle("reconnect refused", {
                reason: event.code === 1000 ? "normal closure" : "policy/auth closure",
                code: event.code,
            });
            return false;
        }
        this.logLifecycle("reconnect allowed", {
            code: event.code,
            reason: event.reason,
        });
        return true;
    }

    private bindSocketListeners(socket: WebSocket): void {
        socket.addEventListener("open", this.handleOpenEvent);
        socket.addEventListener("close", this.handleCloseEvent);
        socket.addEventListener("error", this.handleErrorEvent);
        socket.addEventListener("message", this.handleMessageEvent);
    }

    private detachSocketListeners(socket: WebSocket): void {
        socket.removeEventListener("open", this.handleOpenEvent);
        socket.removeEventListener("close", this.handleCloseEvent);
        socket.removeEventListener("error", this.handleErrorEvent);
        socket.removeEventListener("message", this.handleMessageEvent);
    }

    private logLifecycle(step: string, details?: Record<string, unknown>): void {
        console.info(`[WorkAdventureWebSocket:${this.connectionId}] ${step}`, details ?? {});
    }

    private logLifecycleDebug(step: string, details?: Record<string, unknown>): void {
        console.debug(`[WorkAdventureWebSocket:${this.connectionId}] ${step}`, details ?? {});
    }
}
