import type { TemplatedApp, HttpResponse, HttpRequest, us_socket_context_t } from "uWebSockets.js";
import type { ClientToServerMessage } from "@workadventure/messages";
import type { ConnectingSocketData } from "../models/Websocket/SocketData";
import type { UpgradeFailedData } from "../controllers/IoSocketController";
import type { Socket } from "./SocketManager";
import { PusherWebSocket } from "./PusherWebSocket";
import type { RawSocket } from "./PusherWebSocket";

type UpgradeHandler = (res: HttpResponse, req: HttpRequest, context: us_socket_context_t) => void | Promise<void>;
type OpenHandler = (socket: Socket) => void | Promise<void>;
type MessageHandler = (socket: Socket, message: ClientToServerMessage) => void | Promise<void>;
type CloseHandler = (socket: Socket) => void | Promise<void>;
type DrainHandler = (socket: Socket) => void | Promise<void>;

type RoomWsConfig = {
    idleTimeout?: number;
    maxPayloadLength?: number;
    maxBackpressure?: number;
    upgrade: UpgradeHandler;
    open: OpenHandler;
    message: MessageHandler;
    close: CloseHandler;
    drain?: DrainHandler;
};

export class PusherRoomSocketController {
    private readonly wrappersBySocket = new WeakMap<RawSocket, PusherWebSocket>();

    private fakeDisconnection = false;

    public constructor(private readonly app: TemplatedApp) {}

    private getOrCreateWrapper(rawSocket: RawSocket): PusherWebSocket {
        const existingWrapper = this.wrappersBySocket.get(rawSocket);
        if (existingWrapper) {
            return existingWrapper;
        }
        const wrapper = new PusherWebSocket(rawSocket);
        this.wrappersBySocket.set(rawSocket, wrapper);
        return wrapper;
    }

    public ws(path: string, config: RoomWsConfig): void {
        this.app.ws<ClientToServerMessage | ConnectingSocketData | UpgradeFailedData>(path, {
            idleTimeout: config.idleTimeout,
            maxPayloadLength: config.maxPayloadLength,
            maxBackpressure: config.maxBackpressure,
            upgrade: config.upgrade,
            open: (ws) => {
                if ((ws.getUserData() as { rejected?: boolean }).rejected === true) {
                    return;
                }
                const rawSocket = ws as unknown as RawSocket;
                const socket = this.getOrCreateWrapper(rawSocket);
                Promise.resolve(config.open(socket)).catch((e) => {
                    console.error(e);
                });
            },
            message: (ws, arrayBuffer) => {
                if ((ws.getUserData() as { rejected?: boolean }).rejected === true) {
                    return;
                }
                const rawSocket = ws as unknown as RawSocket;
                const socket = this.getOrCreateWrapper(rawSocket);

                let message;
                try {
                    message = socket.decodeIncomingMessage(arrayBuffer);
                } catch (e) {
                    console.error(e);
                    ws.end(1003, "Invalid message format");
                    return;
                }

                Promise.resolve(config.message(socket, message)).catch((e) => {
                    console.error(e);
                });
            },
            drain: (ws) => {
                if (!config.drain) {
                    return;
                }
                if ((ws.getUserData() as { rejected?: boolean }).rejected === true) {
                    return;
                }
                const rawSocket = ws as unknown as RawSocket;
                const socket = this.getOrCreateWrapper(rawSocket);
                Promise.resolve(config.drain(socket)).catch((e) => {
                    console.error(e);
                });
            },
            close: (ws) => {
                if ((ws.getUserData() as { rejected?: boolean }).rejected === true) {
                    return;
                }
                const rawSocket = ws as unknown as RawSocket;
                const socket = this.wrappersBySocket.get(rawSocket);
                if (!socket) {
                    return;
                }

                if (this.fakeDisconnection) {
                    this.fakeDisconnection = false;
                    this.wrappersBySocket.delete(rawSocket);
                    return;
                }

                Promise.resolve(config.close(socket))
                    .catch((e) => {
                        console.error(e);
                    })
                    .finally(() => {
                        this.wrappersBySocket.delete(rawSocket);
                    });
            },
        });
    }
}
