import type { TemplatedApp, HttpResponse, HttpRequest, us_socket_context_t } from "uWebSockets.js";
import {
    type ClientToServerMessage,
    PusherToFrontWebSocketMessage,
    type ServerToClientMessage,
} from "@workadventure/messages";
import type { ZodObject, ZodRawShape, ZodTypeAny } from "zod";
import * as Sentry from "@sentry/node";
import { asError } from "catch-unknown";
import { CLIENT_DISCONNECTION_RETENTION_MS } from "../enums/EnvironmentVariable";
import type { ConnectingSocketData } from "../models/Websocket/SocketData";
import type { UpgradeFailedData } from "../controllers/IoSocketController";
import { WS_CLOSE_CODE_SESSION_DESTROYED } from "../../common/WebSocketCloseCodes";
import { PusherWebSocket } from "./PusherWebSocket";
import type { RawSocket } from "./PusherWebSocket";
import { validateWebsocketQuery } from "./QueryValidator";
import { getClientIpFromXForwardedFor } from "./ClientIp";

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
    reject: (data: UpgradeFailedData) => void;
};

type UpgradeHandler<TQuery> = (context: UpgradeContext<TQuery>) => void | Promise<void>;
type OpenHandler = (socket: PusherWebSocket) => void | Promise<void>;
// The rejected open handler should return the unique error message that will be sent over the websocket before closing it.
type RejectedOpenHandler = (socketData: UpgradeFailedData) => ServerToClientMessage | Promise<ServerToClientMessage>;
type ReconnectHandler = (socket: PusherWebSocket) => void | Promise<void>;
type MessageHandler = (socket: PusherWebSocket, message: ClientToServerMessage) => void | Promise<void>;
type CloseHandler = (socket: PusherWebSocket, code: number, reason: string) => void | Promise<void>;

type RoomWsQuery = {
    connectionId?: string;
};

type RoomWsQueryValidator<TQuery extends RoomWsQuery> = ZodObject<ZodRawShape, "strip", ZodTypeAny, TQuery>;

type RoomWsConfig<TQuery extends RoomWsQuery> = {
    idleTimeout?: number;
    maxPayloadLength?: number;
    maxBackpressure?: number;
    queryValidator: RoomWsQueryValidator<TQuery>;
    upgrade: UpgradeHandler<TQuery>;
    open: OpenHandler;
    rejectedOpen: RejectedOpenHandler;
    reconnect: ReconnectHandler;
    message: MessageHandler;
    close: CloseHandler;
};

export class PusherRoomSocketController {
    private readonly wrappersBySocket = new WeakMap<RawSocket, PusherWebSocket>();
    // Logical connections a client may resume onto, keyed by the connection id its WorkAdventureWebSocket sent.
    // A retained connection outlives its transport for CLIENT_DISCONNECTION_RETENTION_MS.
    private readonly retainedByConnectionId = new Map<string, PusherWebSocket>();
    private readonly retentionTimeoutsByConnectionId = new Map<string, ReturnType<typeof setTimeout>>();

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
        details: string,
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
                context,
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

    private canReplaceTransportWithoutUpgrade<TQuery extends RoomWsQuery>(
        query: TQuery,
        websocketProtocol: string,
        retained: PusherWebSocket | undefined,
    ): retained is PusherWebSocket {
        if (!retained || retained.isDisconnecting()) {
            return false;
        }

        const socketData = retained.getUserData();
        if (socketData.token !== websocketProtocol) {
            return false;
        }

        if ("roomId" in query && typeof query.roomId === "string" && query.roomId !== socketData.roomId) {
            return false;
        }

        return true;
    }

    private upgradeSocket(
        aborted: boolean,
        res: HttpResponse,
        data: ConnectingSocketData | UpgradeFailedData,
        websocketKey: string,
        websocketProtocol: string,
        websocketExtensions: string,
        context: us_socket_context_t,
    ) {
        if (aborted) {
            // If the response points to nowhere, don't attempt an upgrade
            return;
        }

        res.cork(() => {
            res.upgrade(data, websocketKey, websocketProtocol, websocketExtensions, context);
        });
    }

    private clearRetentionTimeout(connectionId: string): void {
        const timeout = this.retentionTimeoutsByConnectionId.get(connectionId);
        if (!timeout) {
            return;
        }

        clearTimeout(timeout);
        this.retentionTimeoutsByConnectionId.delete(connectionId);
    }

    public ws<TQuery extends RoomWsQuery>(path: string, config: RoomWsConfig<TQuery>): void {
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

                    const clientLastReceivedNonce = this.parseReconnectNonce(
                        urlSearchParams.get("lastReceivedNonce") ?? undefined,
                        "lastReceivedNonce",
                    );
                    const retained =
                        query.connectionId === undefined
                            ? undefined
                            : this.retainedByConnectionId.get(query.connectionId);

                    if (
                        clientLastReceivedNonce !== undefined &&
                        this.canReplaceTransportWithoutUpgrade(query, websocketProtocol, retained)
                    ) {
                        this.upgradeSocket(
                            upgradeAborted.aborted,
                            res,
                            { ...retained.getUserData(), clientLastReceivedNonce },
                            websocketKey,
                            websocketProtocol,
                            websocketExtensions,
                            context,
                        );
                        return;
                    }
                    const ipAddress = getClientIpFromXForwardedFor(req.getHeader("x-forwarded-for"));
                    await config.upgrade({
                        query,
                        request: {
                            method: req.getMethod(),
                            url: req.getUrl(),
                            ipAddress,
                            locale: req.getHeader("accept-language"),
                            token: websocketProtocol,
                        },
                        isAborted: () => upgradeAborted.aborted,
                        upgrade: (data) => {
                            // The nonce travels with this transport only: a resume that turns out to be illegitimate
                            // must not disturb another connection of the same tab that is resuming concurrently.
                            this.upgradeSocket(
                                upgradeAborted.aborted,
                                res,
                                { ...data, clientLastReceivedNonce },
                                websocketKey,
                                websocketProtocol,
                                websocketExtensions,
                                context,
                            );
                        },
                        reject: (data) => {
                            this.upgradeSocket(
                                upgradeAborted.aborted,
                                res,
                                data,
                                websocketKey,
                                websocketProtocol,
                                websocketExtensions,
                                context,
                            );
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
                        const errorMessage = await config.rejectedOpen(socketData);
                        ws.send(
                            PusherToFrontWebSocketMessage.encode({
                                nonce: 1,
                                message: errorMessage,
                            }).finish(),
                            true,
                        );
                        ws.end(1000, "Error message sent");
                        return;
                    }

                    const rawSocket = ws as unknown as RawSocket;

                    const connectionId = socketData.connectionId;
                    const retained =
                        connectionId === undefined ? undefined : this.retainedByConnectionId.get(connectionId);
                    const clientLastReceivedNonce = socketData.clientLastReceivedNonce;
                    socketData.clientLastReceivedNonce = undefined;

                    if (
                        connectionId !== undefined &&
                        retained &&
                        clientLastReceivedNonce !== undefined &&
                        !retained.isDisconnecting()
                    ) {
                        console.info("[PusherRoomSocketController] attempting transport replacement", {
                            connectionId,
                            userUuid: socketData.userUuid,
                            clientLastReceivedNonce,
                        });
                        const replaced = retained.replaceSocket(rawSocket, clientLastReceivedNonce);

                        if (replaced) {
                            this.clearRetentionTimeout(connectionId);
                            this.wrappersBySocket.set(rawSocket, retained);

                            await config.reconnect(retained);
                        }

                        return;
                    }

                    if (clientLastReceivedNonce !== undefined) {
                        ws.end(1008, "Cannot replace socket: previous connection not retained");
                        return;
                    }

                    const socket = this.getOrCreateWrapper(rawSocket);
                    if (connectionId !== undefined) {
                        this.clearRetentionTimeout(connectionId);
                        this.retainedByConnectionId.set(connectionId, socket);
                    }
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
                if (ws.getUserData().rejected === true) {
                    return;
                }

                const rawSocket = ws as unknown as RawSocket;
                const socket = this.getOrCreateWrapper(rawSocket);
                if (!socket.isCurrentTransport(rawSocket)) {
                    return;
                }
                socket.handleDrain();
            },
            close: (ws, code, message) => {
                const socketData = ws.getUserData();
                if (socketData.rejected === true) {
                    return;
                }

                const reason = message ? Buffer.from(message).toString() : "";
                const rawSocket = ws as unknown as RawSocket;
                const socket = this.wrappersBySocket.get(rawSocket);
                if (!socket) {
                    return;
                }
                this.wrappersBySocket.delete(rawSocket);
                if (!socket.isCurrentTransport(rawSocket)) {
                    return;
                }

                socket.handleTransportClosed();

                const connectionId = socketData.connectionId;
                const forgetRetained = () => {
                    if (connectionId !== undefined && this.retainedByConnectionId.get(connectionId) === socket) {
                        this.retainedByConnectionId.delete(connectionId);
                    }
                };
                // Terminal teardown: no reconnect retry will replace this transport from here on.
                const closePermanently = () => {
                    socket.markPermanentlyDisconnected();
                    return Promise.resolve(config.close(socket, code, reason));
                };
                if (code === 1000 || code === 1001 || code === WS_CLOSE_CODE_SESSION_DESTROYED) {
                    closePermanently().then(forgetRetained, (e) => {
                        console.error(e);
                        forgetRetained();
                    });
                    return;
                }

                // Only a connection the client can name (by connection id) is worth retaining for a resume.
                if (connectionId !== undefined && this.retainedByConnectionId.get(connectionId) === socket) {
                    this.clearRetentionTimeout(connectionId);
                    const timeout = setTimeout(() => {
                        this.retentionTimeoutsByConnectionId.delete(connectionId);

                        if (this.retainedByConnectionId.get(connectionId) === socket) {
                            closePermanently().then(forgetRetained, (e) => {
                                console.error(e);
                                forgetRetained();
                            });
                        }
                    }, CLIENT_DISCONNECTION_RETENTION_MS);

                    this.retentionTimeoutsByConnectionId.set(connectionId, timeout);
                    return;
                }

                closePermanently().catch((e) => {
                    console.error(e);
                });
            },
        });
    }
}
