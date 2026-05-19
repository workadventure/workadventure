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
    private static readonly RECONNECT_CONNECT_TIMEOUT_MS = Math.min(5_000, CLIENT_DISCONNECTION_RETENTION_MS);
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
    private reconnectStartedAt: number | undefined;
    private reconnectConnectTimeout: ReturnType<typeof setTimeout> | undefined;
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
        if (this.manuallyClosed) {
            this.logLifecycle("send ignored because websocket was manually closed", {
                messageType: message.message?.$case,
            });
            return;
        }

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
        if (this.socket.readyState !== WebSocket.OPEN) {
            this.logLifecycle("send buffered until websocket reopens", {
                nonce,
                messageType: message.message?.$case,
                readyState: this.socket.readyState,
                reconnectAttempt: this.reconnectAttempt,
            });
            return;
        }
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
        this.clearReconnectConnectTimeout();
        this._reconnectingStream.next(false);
        this._reconnectingStream.complete();
        this.socket.close(code, reason);
    }

    public closeForPageUnload(): void {
        this.logLifecycle("page unload close requested", {
            readyState: this.socket.readyState,
        });
        this.manuallyClosed = true;
        this.clearReconnectConnectTimeout();
        if (this.socket.readyState === WebSocket.CLOSED) {
            return;
        }
        this.socket.close(1000, "Page unloading");
    }

    private handleOpenEvent = (): void => {
        const isReconnection = this.reconnectAttempted;
        this.clearReconnectConnectTimeout();
        this.logLifecycle("open", {
            isReconnection,
            reconnectAttempt: this.reconnectAttempt,
            lastReceivedNonce: this.lastReceivedNonce,
            bufferedMessages: this.outgoingMessagesStore.getAll().length,
        });
        this.reconnectAttempted = false;
        this.reconnectStartedAt = undefined;
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
        this.clearReconnectConnectTimeout();
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
            this.reconnectStartedAt ??= Date.now();
            this.logLifecycle("starting reconnect", {
                reconnectAttempt: this.reconnectAttempt,
                lastReceivedNonce: this.lastReceivedNonce,
                elapsedSinceReconnectStartedMs: Date.now() - this.reconnectStartedAt,
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
        this.scheduleReconnectConnectTimeout(socket);
        return socket;
    }

    private shouldReconnect(event: CloseEvent): boolean {
        // Do not reconnect if handshake/auth was refused.
        if (event.code === 1000 || event.code === 1008) {
            this.logLifecycle("reconnect refused", {
                reason: event.code === 1000 ? "normal closure" : "policy/auth closure",
                code: event.code,
            });
            return false;
        }
        if (this.reconnectStartedAt !== undefined) {
            const elapsedMs = Date.now() - this.reconnectStartedAt;
            if (elapsedMs >= CLIENT_DISCONNECTION_RETENTION_MS) {
                this.logLifecycle("reconnect refused", {
                    reason: "retention window expired",
                    code: event.code,
                    elapsedMs,
                    retentionMs: CLIENT_DISCONNECTION_RETENTION_MS,
                });
                return false;
            }
        }
        this.logLifecycle("reconnect allowed", {
            code: event.code,
            reason: event.reason,
            reconnectAttempt: this.reconnectAttempt,
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

    private scheduleReconnectConnectTimeout(socket: WebSocket): void {
        if (!this.reconnectAttempted) {
            return;
        }

        this.clearReconnectConnectTimeout();
        this.reconnectConnectTimeout = setTimeout(() => {
            if (socket.readyState !== WebSocket.CONNECTING || socket !== this.socket) {
                return;
            }

            this.logLifecycle("reconnect transport still connecting; forcing retry", {
                reconnectAttempt: this.reconnectAttempt,
                timeoutMs: WorkAdventureWebSocket.RECONNECT_CONNECT_TIMEOUT_MS,
                elapsedSinceReconnectStartedMs:
                    this.reconnectStartedAt === undefined ? undefined : Date.now() - this.reconnectStartedAt,
            });
            socket.close();
        }, WorkAdventureWebSocket.RECONNECT_CONNECT_TIMEOUT_MS);
    }

    private clearReconnectConnectTimeout(): void {
        if (!this.reconnectConnectTimeout) {
            return;
        }

        clearTimeout(this.reconnectConnectTimeout);
        this.reconnectConnectTimeout = undefined;
    }

    private logLifecycle(step: string, details?: Record<string, unknown>): void {
        console.info(`[WorkAdventureWebSocket:${this.connectionId}] ${step}`, details ?? {});
    }

    private logLifecycleDebug(step: string, details?: Record<string, unknown>): void {
        console.debug(`[WorkAdventureWebSocket:${this.connectionId}] ${step}`, details ?? {});
    }
}
