import type { TemplatedApp, HttpResponse, HttpRequest, us_socket_context_t } from "uWebSockets.js";
import type { ClientToServerMessage } from "@workadventure/messages";
import type { ZodObject, ZodRawShape, infer as ZodInfer } from "zod";
import type { ConnectingSocketData } from "../models/Websocket/SocketData";
import type { UpgradeFailedData } from "../controllers/IoSocketController";
import type { Socket } from "./SocketManager";
import { PusherWebSocket } from "./PusherWebSocket";
import type { RawSocket } from "./PusherWebSocket";
import { validateWebsocketQuery } from "./QueryValidator";

type UpgradeContext<TQuery> = {
    query: TQuery;
    request: {
        method: string;
        url: string;
        ipAddress: string;
        locale: string;
        token: string;
    };
    isAborted: () => boolean;
    upgrade: (data: ConnectingSocketData) => void;
    failUpgrade: (data: UpgradeFailedData) => void;
};

type UpgradeHandler<TQuery> = (context: UpgradeContext<TQuery>) => void | Promise<void>;
type OpenHandler = (socket: Socket) => void | Promise<void>;
type MessageHandler = (socket: Socket, message: ClientToServerMessage) => void | Promise<void>;
type CloseHandler = (socket: Socket) => void | Promise<void>;
type DrainHandler = (socket: Socket) => void | Promise<void>;

type RoomWsConfig<TQueryValidator extends ZodObject<ZodRawShape>> = {
    idleTimeout?: number;
    maxPayloadLength?: number;
    maxBackpressure?: number;
    queryValidator: TQueryValidator;
    upgrade: UpgradeHandler<ZodInfer<TQueryValidator>>;
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

    private rejectWithBadRequest(
        res: HttpResponse,
        req: HttpRequest,
        context: us_socket_context_t,
        details: string
    ): void {
        const websocketKey = req.getHeader("sec-websocket-key");
        const websocketProtocol = req.getHeader("sec-websocket-protocol");
        const websocketExtensions = req.getHeader("sec-websocket-extensions");

        res.cork(() => {
            res.upgrade(
                {
                    rejected: true,
                    reason: "error",
                    error: {
                        status: "error",
                        type: "error",
                        title: "400 Bad Request",
                        subtitle: "Something wrong happened while connecting!",
                        image: "",
                        code: "WS_BAD_REQUEST",
                        details,
                    },
                } satisfies UpgradeFailedData,
                websocketKey,
                websocketProtocol,
                websocketExtensions,
                context
            );
        });
    }

    private parseReconnectNonce(rawValue: string | undefined, key: string): number | undefined {
        if (rawValue === undefined || rawValue === "") {
            return undefined;
        }

        const parsed = Number(rawValue);
        if (!Number.isInteger(parsed) || parsed < 0) {
            throw new Error(`Parameter ${key}: Expected nonnegative integer, received ${rawValue}`);
        }
        return parsed;
    }

    public ws<TQueryValidator extends ZodObject<ZodRawShape>>(
        path: string,
        config: RoomWsConfig<TQueryValidator>
    ): void {
        this.app.ws<ClientToServerMessage | ConnectingSocketData | UpgradeFailedData>(path, {
            idleTimeout: config.idleTimeout,
            maxPayloadLength: config.maxPayloadLength,
            maxBackpressure: config.maxBackpressure,
            upgrade: (res, req, context) => {
                const upgradeAborted = { aborted: false };

                res.onAborted(() => {
                    upgradeAborted.aborted = true;
                });

                const query = validateWebsocketQuery(req, res, context, config.queryValidator);
                if (query === undefined) {
                    return;
                }

                const websocketKey = req.getHeader("sec-websocket-key");
                const websocketProtocol = req.getHeader("sec-websocket-protocol");
                const websocketExtensions = req.getHeader("sec-websocket-extensions");
                const urlSearchParams = new URLSearchParams(req.getQuery());

                try {
                    Promise.resolve(
                        config.upgrade({
                            query,
                            request: {
                                method: req.getMethod(),
                                url: req.getUrl(),
                                ipAddress: req.getHeader("x-forwarded-for"),
                                locale: req.getHeader("accept-language"),
                                token: websocketProtocol,
                            },
                            isAborted: () => upgradeAborted.aborted,
                            upgrade: (data) => {
                                res.cork(() => {
                                    data.reconnectLastReceivedNonce = this.parseReconnectNonce(
                                        urlSearchParams.get("lastReceivedNonce") ?? undefined,
                                        "lastReceivedNonce"
                                    );
                                    data.reconnectLastSentNonce = this.parseReconnectNonce(
                                        urlSearchParams.get("lastSentNonce") ?? undefined,
                                        "lastSentNonce"
                                    );

                                    res.upgrade(data, websocketKey, websocketProtocol, websocketExtensions, context);
                                });
                            },
                            failUpgrade: (data) => {
                                res.cork(() => {
                                    res.upgrade(data, websocketKey, websocketProtocol, websocketExtensions, context);
                                });
                            },
                        })
                    ).catch((e) => {
                        console.error(e);
                    });
                } catch (e) {
                    const details = e instanceof Error ? e.message : "Invalid websocket query parameters";
                    this.rejectWithBadRequest(res, req, context, details);
                }
            },
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
