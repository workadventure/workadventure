import type { WebSocket } from "uWebSockets.js";
import {
    FrontToPusherWebSocketMessage,
    PusherToFrontWebSocketMessage,
    type ServerToClientMessage,
    type ClientToServerMessage,
    type BatchMessage,
    type SubMessage,
} from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import { NoncedMessageStore } from "../../common/NoncedMessageStore";

import type { SocketData } from "../models/Websocket/SocketData";

export type RawSocket = WebSocket<SocketData>;

export type ConnectionStatusManager = {
    isDisconnecting: (socket: PusherWebSocket) => boolean;
    startDisconnecting: (socket: PusherWebSocket) => boolean;
};

export class PusherWebSocket {
    private static readonly DISCONNECTION_RETENTION_MS = 30_000;
    private static readonly KEEP_ALIVE_INTERVAL_MS = 25_000;

    private socket: RawSocket;
    private keepAliveInterval: NodeJS.Timeout | undefined;
    private batchTimeout: NodeJS.Timeout | undefined;
    private batchedMessages: BatchMessage = {
        event: "",
        payload: [],
    };
    private nextOutgoingNonce = 1;
    private lastReceivedNonce = 0;
    private readonly outgoingMessagesStore = new NoncedMessageStore<Uint8Array<ArrayBuffer>>(
        PusherWebSocket.DISCONNECTION_RETENTION_MS
    );

    public constructor(socket: RawSocket, private readonly connectionStatusManager: ConnectionStatusManager) {
        this.socket = socket;
        this.startKeepAlive();
    }

    public getUserData(): SocketData {
        return this.socket.getUserData();
    }

    public send(message: ServerToClientMessage): ReturnType<RawSocket["send"]> {
        const nonce = this.nextOutgoingNonce;
        const payloadWithNonce = PusherToFrontWebSocketMessage.encode({
            nonce,
            message,
        }).finish();
        this.nextOutgoingNonce += 1;
        this.outgoingMessagesStore.add(nonce, payloadWithNonce);

        return this.socket.send(payloadWithNonce, true);
    }

    public emitInBatch(payload: SubMessage): void {
        this.batchedMessages.payload.push(payload);

        if (this.batchTimeout) {
            return;
        }

        this.batchTimeout = setTimeout(() => {
            this.batchTimeout = undefined;
            if (this.isDisconnecting()) {
                this.resetBatch();
                return;
            }

            this.send({
                message: {
                    $case: "batchMessage",
                    batchMessage: this.batchedMessages,
                },
            });
            this.resetBatch();
        }, 100);
    }

    public decodeIncomingMessage(payload: ArrayBuffer | ArrayBufferView): ClientToServerMessage | undefined {
        const bytes =
            payload instanceof ArrayBuffer
                ? new Uint8Array(payload)
                : new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
        const frame = FrontToPusherWebSocketMessage.decode(bytes);
        if (!frame.message) {
            throw new Error("Invalid websocket payload: missing client message");
        }
        if (frame.nonce <= this.lastReceivedNonce) {
            return undefined;
        }
        this.lastReceivedNonce = frame.nonce;
        return frame.message;
    }

    public ping(...args: Parameters<RawSocket["ping"]>): ReturnType<RawSocket["ping"]> {
        return this.socket.ping(...args);
    }

    public end(...args: Parameters<RawSocket["end"]>): ReturnType<RawSocket["end"]> {
        return this.socket.end(...args);
    }

    public getBufferedAmount(): number {
        return this.socket.getBufferedAmount();
    }

    public isDisconnecting(): boolean {
        return this.connectionStatusManager.isDisconnecting(this);
    }

    public startDisconnecting(): boolean {
        const started = this.connectionStatusManager.startDisconnecting(this);
        if (started) {
            this.stopKeepAlive();
            this.stopBatching();
        }
        return started;
    }

    public isCurrentTransport(rawSocket: RawSocket): boolean {
        return this.socket === rawSocket;
    }

    public replaceSocket(newSocket: RawSocket, clientLastReceivedNonce: number): boolean {
        const socketData = this.socket.getUserData();
        console.info(
            `Replacing WebSocket transport for user ${socketData.userUuid} on tab ${socketData.tabId} (lastReceivedNonce=${clientLastReceivedNonce})`
        );

        if (!this.outgoingMessagesStore.hasEveryNonceAfter(clientLastReceivedNonce)) {
            console.warn(
                `Cannot replace WebSocket transport for user ${socketData.userUuid} on tab ${
                    socketData.tabId
                }: server is missing messages to replay (lastReceivedNonce=${clientLastReceivedNonce}, oldestStoredNonce=${
                    this.outgoingMessagesStore.getAll()[0]?.nonce
                })`
            );
            Sentry.captureMessage(
                `Cannot replace WebSocket transport for user ${socketData.userUuid} on tab ${
                    socketData.tabId
                }: server is missing messages to replay (lastReceivedNonce=${clientLastReceivedNonce}, oldestStoredNonce=${
                    this.outgoingMessagesStore.getAll()[0]?.nonce
                })`,
                {
                    tags: {
                        userUuid: socketData.userUuid,
                        tabId: socketData.tabId,
                    },
                }
            );
            newSocket.end(1008, "Cannot replace socket: server is missing messages to replay");
            return false;
        }

        const previousSocket = this.socket;
        const previousSocketData = previousSocket.getUserData();
        const newSocketData = newSocket.getUserData();

        if (previousSocketData.userUuid !== newSocketData.userUuid) {
            console.warn(
                `Cannot replace WebSocket transport: user UUID mismatch (previous=${previousSocketData.userUuid}, new=${newSocketData.userUuid})`
            );
            Sentry.captureMessage(
                `Cannot replace WebSocket transport: user UUID mismatch (previous=${previousSocketData.userUuid}, new=${newSocketData.userUuid})`,
                {
                    tags: {
                        previousUserUuid: previousSocketData.userUuid,
                        newUserUuid: newSocketData.userUuid,
                    },
                }
            );
            newSocket.end(1008, "Cannot replace socket: user UUID mismatch");
            return false;
        }

        // Keep logical connection state (room/back stream/subscriptions) while swapping only the transport.
        Object.assign(newSocketData, previousSocketData);

        this.socket = newSocket;

        const messagesToReplay = this.outgoingMessagesStore.getAfter(clientLastReceivedNonce);
        for (const { payload } of messagesToReplay) {
            this.socket.send(payload, true);
        }

        this.outgoingMessagesStore.clear();

        // Close the old transport only after rebinding so the logical connection keeps running.
        previousSocket.end(1008, "Replaced by a reconnected socket");

        return true;
    }

    private startKeepAlive(): void {
        if (this.keepAliveInterval) {
            return;
        }

        // Keep the pusher WebSocket active across proxies/load balancers; app-level ping can be delayed by browsers.
        this.keepAliveInterval = setInterval(() => {
            if (!this.isDisconnecting()) {
                this.socket.ping();
            }
        }, PusherWebSocket.KEEP_ALIVE_INTERVAL_MS);
    }

    private stopKeepAlive(): void {
        if (!this.keepAliveInterval) {
            return;
        }

        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = undefined;
    }

    private stopBatching(): void {
        if (!this.batchTimeout) {
            this.resetBatch();
            return;
        }

        clearTimeout(this.batchTimeout);
        this.batchTimeout = undefined;
        this.resetBatch();
    }

    private resetBatch(): void {
        this.batchedMessages = {
            event: "",
            payload: [],
        };
    }
}
