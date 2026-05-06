import type { TemplatedApp, HttpResponse, HttpRequest, us_socket_context_t } from "uWebSockets.js";
import type { ClientToServerMessage } from "@workadventure/messages";
import type { ZodObject, ZodRawShape, infer as ZodInfer } from "zod";
import * as Sentry from "@sentry/node";
import { asError } from "catch-unknown";
import type { ConnectingSocketData } from "../models/Websocket/SocketData";
import type { UpgradeFailedData } from "../controllers/IoSocketController";
import type { Socket, SocketUpgradeFailed } from "./SocketManager";
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
    upgrade: (data: ConnectingSocketData | UpgradeFailedData) => void;
};

type UpgradeHandler<TQuery> = (context: UpgradeContext<TQuery>) => void | Promise<void>;
type OpenHandler = (socket: Socket) => void | Promise<void>;
type RejectedOpenHandler = (socket: SocketUpgradeFailed) => void | Promise<void>;
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
    rejectedOpen: RejectedOpenHandler;
    message: MessageHandler;
    close: CloseHandler;
    drain?: DrainHandler;
};

type WebSocketContext = {
    socket: PusherWebSocket;
    clientLastReceivedNonce?: number;
};

export class PusherRoomSocketController {
    private readonly wrappersBySocket = new WeakMap<RawSocket, PusherWebSocket>();
    private readonly contextByTabKey = new Map<string, WebSocketContext>();

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

    private rejectWithInternalError(
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
                        title: "500 Internal Server Error",
                        subtitle: "Something wrong happened while connecting!",
                        image: "",
                        code: "internal_error",
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
        this.app.ws<ConnectingSocketData | UpgradeFailedData>(path, {
            idleTimeout: config.idleTimeout,
            maxPayloadLength: config.maxPayloadLength,
            maxBackpressure: config.maxBackpressure,
            upgrade: (res, req, context) => {
                (async () => {
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

                    const tabContext = this.contextByTabKey.get(query.tabId);
                    if (tabContext) {
                        tabContext.clientLastReceivedNonce = this.parseReconnectNonce(
                            urlSearchParams.get("lastReceivedNonce") ?? undefined,
                            "lastReceivedNonce"
                        );
                    }

                    await config.upgrade({
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
                            if (upgradeAborted.aborted) {
                                // If the response points to nowhere, don't attempt an upgrade
                                return;
                            }

                            res.cork(() => {
                                res.upgrade(data, websocketKey, websocketProtocol, websocketExtensions, context);
                            });
                        },
                    });
                })().catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
                    this.rejectWithInternalError(res, req, context, asError(e).message);
                });
            },
            open: (ws) => {
                (async () => {
                    const socketData = ws.getUserData();
                    if (socketData.rejected === true) {
                        await config.rejectedOpen(ws as SocketUpgradeFailed);
                        return;
                    }

                    const rawSocket = ws as unknown as RawSocket;

                    const tabId = socketData.tabId;
                    const context = this.contextByTabKey.get(tabId);
                    if (context) {
                        const replaced = context.socket.replaceSocket(rawSocket, context.clientLastReceivedNonce!);

                        if (replaced) {
                            this.wrappersBySocket.set(rawSocket, context.socket);
                        }

                        return;
                    }

                    const socket = this.getOrCreateWrapper(rawSocket);
                    this.contextByTabKey.set(tabId, {
                        socket,
                    });
                    await config.open(socket);
                })().catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
                });
            },
            message: (ws, arrayBuffer) => {
                if (ws.getUserData().rejected === true) {
                    ws.end(1008, "Connection rejected");
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
                if (!message) {
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
                if (ws.getUserData().rejected === true) {
                    return;
                }

                const rawSocket = ws as unknown as RawSocket;
                const socket = this.getOrCreateWrapper(rawSocket);
                Promise.resolve(config.drain(socket)).catch((e) => {
                    console.error(e);
                });
            },
            close: (ws) => {
                const socketData = ws.getUserData();
                if (socketData.rejected === true) {
                    return;
                }

                const rawSocket = ws as unknown as RawSocket;
                const socket = this.wrappersBySocket.get(rawSocket);
                if (!socket) {
                    return;
                }
                this.wrappersBySocket.delete(rawSocket);

                if (!socket.isCurrentTransport(rawSocket)) {
                    return;
                }

                Promise.resolve(config.close(socket))
                    .catch((e) => {
                        console.error(e);
                    })
                    .finally(() => {
                        const tabId = socketData.tabId;
                        if (this.contextByTabKey.get(tabId)?.socket === socket) {
                            this.contextByTabKey.delete(tabId);
                        }
                    });
            },
        });
    }
}
