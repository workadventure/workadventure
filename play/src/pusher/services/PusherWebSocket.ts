import type { WebSocket } from "uWebSockets.js";

import type { SocketData } from "../models/Websocket/SocketData";

export type RawSocket = WebSocket<SocketData>;

export class PusherWebSocket {
    private socket: RawSocket;

    public constructor(socket: RawSocket) {
        this.socket = socket;
    }

    public getUserData(): SocketData {
        return this.socket.getUserData();
    }

    public send(...args: Parameters<RawSocket["send"]>): ReturnType<RawSocket["send"]> {
        return this.socket.send(...args);
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
