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
    private nextOutgoingNonce = 1;
    private lastReceivedNonce = 0;
    private readonly outgoingMessagesStore = new NoncedMessageStore<Uint8Array<ArrayBuffer>>(
        CLIENT_DISCONNECTION_RETENTION_MS
    );

    private socket: WebSocket;

    public constructor(url: string | URL, protocols?: string[]) {
        this.url = new URL(url);
        this.protocols = protocols;
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

        this.socket.send(payloadWithNonce);
    }

    public getLastReceivedNonce(): number {
        return this.lastReceivedNonce;
    }

    public close(code?: number, reason?: string): void {
        this.manuallyClosed = true;
        this.detachSocketListeners(this.socket);
        this._reconnectingStream.next(false);
        this._reconnectingStream.complete();
        this.socket.close(code, reason);
    }

    private handleOpenEvent = (): void => {
        const isReconnection = this.reconnectAttempted;
        this.reconnectAttempted = false;
        if (isReconnection) {
            for (const { payload } of this.outgoingMessagesStore.getAll()) {
                this.socket.send(payload);
            }
            this._reconnectingStream.next(false);
        }
        const event = new Event("open");
        this.onopen?.call(this, event);
    };

    private handleCloseEvent = (event: CloseEvent): void => {
        this.detachSocketListeners(this.socket);

        if (!this.manuallyClosed && this.shouldReconnect(event)) {
            this.reconnectAttempted = true;
            this._reconnectingStream.next(true);
            this.socket = this.createSocket();
            return;
        }

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

        this.onmessage?.call(this, messageEvent);
    };

    private createSocket(): WebSocket {
        const socketUrl = this.url;
        if (this.reconnectAttempted) {
            socketUrl.searchParams.set("lastReceivedNonce", this.lastReceivedNonce.toString());
        }

        const socket = WorkAdventureWebSocket.websocketFactory
            ? WorkAdventureWebSocket.websocketFactory(socketUrl.toString(), this.protocols)
            : new WebSocket(socketUrl, this.protocols);
        socket.binaryType = "arraybuffer";

        this.bindSocketListeners(socket);
        return socket;
    }

    private shouldReconnect(event: CloseEvent): boolean {
        if (this.reconnectAttempted) return false;
        // Do not reconnect if handshake/auth was refused.
        if (event.code === 1000 || event.code === 1008) return false;
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
}
