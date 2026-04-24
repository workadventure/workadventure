import type { WebSocket } from "uWebSockets.js";
import {
    FrontToPusherWebSocketMessage,
    PusherToFrontWebSocketMessage,
    type ServerToClientMessage,
    type ClientToServerMessage,
} from "@workadventure/messages";

import type { SocketData } from "../models/Websocket/SocketData";

export type RawSocket = WebSocket<SocketData>;

export class PusherWebSocket {
    private socket: RawSocket;
    private nextOutgoingNonce = 1;
    private lastReceivedNonce = 0;

    public constructor(socket: RawSocket) {
        this.socket = socket;
    }

    public getUserData(): SocketData {
        return this.socket.getUserData();
    }

    public send(message: ServerToClientMessage): ReturnType<RawSocket["send"]> {
        const payloadWithNonce = PusherToFrontWebSocketMessage.encode({
            nonce: this.nextOutgoingNonce,
            message,
        }).finish();
        this.nextOutgoingNonce += 1;

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
}
