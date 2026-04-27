import type { WebSocket } from "uWebSockets.js";
import {
    FrontToPusherWebSocketMessage,
    PusherToFrontWebSocketMessage,
    type ServerToClientMessage,
    type ClientToServerMessage,
} from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import { NoncedMessageStore } from "../../common/NoncedMessageStore";

import type { SocketData } from "../models/Websocket/SocketData";

export type RawSocket = WebSocket<SocketData>;

export class PusherWebSocket {
    private static readonly DISCONNECTION_RETENTION_MS = 30_000;

    private socket: RawSocket;
    private nextOutgoingNonce = 1;
    private lastReceivedNonce = 0;
    private readonly outgoingMessagesStore = new NoncedMessageStore<Uint8Array<ArrayBuffer>>(
        PusherWebSocket.DISCONNECTION_RETENTION_MS
    );

    public constructor(socket: RawSocket) {
        this.socket = socket;
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

    public getLastReceivedNonce(): number {
        return this.lastReceivedNonce;
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

    public getRemoteAddressAsText(): ArrayBuffer {
        return this.socket.getRemoteAddressAsText();
    }

    public closeTransport(code: number, reason: string): void {
        this.socket.end(code, reason);
    }

    public isCurrentTransport(rawSocket: RawSocket): boolean {
        return this.socket === rawSocket;
    }

    public replaceSocket(newSocket: RawSocket, clientLastReceivedNonce: number, clientLastSentNonce: number): boolean {
        const socketData = this.socket.getUserData();
        console.info(
            `Replacing WebSocket transport for user ${socketData.userUuid} on tab ${socketData.tabId} (lastReceivedNonce=${clientLastReceivedNonce}, lastSentNonce=${clientLastSentNonce})`
        );

        if (!this.outgoingMessagesStore.hasEveryNonceAfter(clientLastReceivedNonce, clientLastSentNonce)) {
            console.warn(
                `Cannot replace WebSocket transport for user ${socketData.userUuid} on tab ${
                    socketData.tabId
                }: server is missing messages to replay (lastReceivedNonce=${clientLastReceivedNonce}, lastSentNonce=${clientLastSentNonce}, oldestStoredNonce=${
                    this.outgoingMessagesStore.getAll()[0]?.nonce
                })`
            );
            Sentry.captureMessage(
                `Cannot replace WebSocket transport for user ${socketData.userUuid} on tab ${
                    socketData.tabId
                }: server is missing messages to replay (lastReceivedNonce=${clientLastReceivedNonce}, lastSentNonce=${clientLastSentNonce}, oldestStoredNonce=${
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

        // Keep logical connection state (room/back stream/subscriptions) while swapping only the transport.
        Object.assign(newSocketData, previousSocketData, {
            disconnecting: false,
        });

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
}
