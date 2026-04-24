import type { WebSocket } from "uWebSockets.js";
import {
    FrontToPusherWebSocketMessage,
    PusherToFrontWebSocketMessage,
    type ServerToClientMessage,
    type ClientToServerMessage,
} from "@workadventure/messages";
import { NoncedMessageStore } from "../../common/NoncedMessageStore";

import type { SocketData } from "../models/Websocket/SocketData";

export type RawSocket = WebSocket<SocketData>;

export class PusherWebSocket {
    private static readonly DISCONNECTION_RETENTION_MS = 30_000;

    private socket: RawSocket;
    private nextOutgoingNonce = 1;
    private lastReceivedNonce = 0;
    private readonly outgoingMessagesStore = new NoncedMessageStore<Uint8Array>(
        PusherWebSocket.DISCONNECTION_RETENTION_MS
    );

    public constructor(socket: RawSocket) {
        this.socket = socket;
        this.outgoingMessagesStore.beginDisconnectionRetention();
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

    public decodeIncomingMessage(payload: ArrayBuffer | ArrayBufferView): ClientToServerMessage {
        const bytes =
            payload instanceof ArrayBuffer
                ? new Uint8Array(payload)
                : new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
        const frame = FrontToPusherWebSocketMessage.decode(bytes);
        if (!frame.message) {
            throw new Error("Invalid websocket payload: missing client message");
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

    public replaceSocket(newSocket: RawSocket, clientLastReceivedNonce: number, clientLastSentNonce: number): void {
        const previousSocket = this.socket;
        const previousSocketData = previousSocket.getUserData();
        const newSocketData = newSocket.getUserData();

        console.log(`[PusherWebSocket] Attempting reconnection`);

        // Keep logical connection state (room/back stream/subscriptions) while swapping only the transport.
        Object.assign(newSocketData, previousSocketData, {
            disconnecting: false,
        });

        this.socket = newSocket;

        // Close the old transport only after rebinding so the logical connection keeps running.
        previousSocket.end(1012, "Replaced by a reconnected socket");
    }
}
