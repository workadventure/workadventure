import { z } from "zod";
import type { AnswerMessage, CompanionDetail, ErrorApiData, SubMessage, WokaDetail } from "@workadventure/messages";
import {
    apiVersionHash,
    ClientToServerMessage,
    noUndefined,
    ServerToClientMessage as ServerToClientMessageTsProto,
    ServerToClientMessage,
} from "@workadventure/messages";
import { JsonWebTokenError } from "jsonwebtoken";
import * as Sentry from "@sentry/node";
import type { TemplatedApp, WebSocket } from "uWebSockets.js";
import { asError } from "catch-unknown";
import Debug from "debug";
import { AxiosError } from "axios";
import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";
import type { FetchMemberDataByUuidResponse } from "../services/AdminApi";
import type { AdminSocketTokenData } from "../services/JWTTokenManager";
import { jwtTokenManager, tokenInvalidException } from "../services/JWTTokenManager";
import type { Socket, SocketUpgradeFailed } from "../services/SocketManager";
import { socketManager } from "../services/SocketManager";
import { ADMIN_SOCKETS_TOKEN, DISABLE_ANONYMOUS, SOCKET_IDLE_TIMER } from "../enums/EnvironmentVariable";
import type { AdminSocketData } from "../models/Websocket/AdminSocketData";
import type { AdminMessageInterface } from "../models/Websocket/Admin/AdminMessages";
import { isAdminMessageInterface } from "../models/Websocket/Admin/AdminMessages";
import { adminService } from "../services/AdminService";
import { validateWebsocketQuery } from "../services/QueryValidator";
import type { SocketData, SpaceName } from "../models/Websocket/SocketData";
import { emitInBatch } from "../services/IoSocketHelpers";
import { ClientAbortError } from "../models/ClientAbortError";

const debug = Debug("pusher:requests");

type UpgradeFailedInvalidData = {
    rejected: true;
    reason: "tokenInvalid" | "invalidVersion" | null;
    message: string;
    roomId: string;
};

type UpgradeFailedErrorData = {
    rejected: true;
    reason: "error";
    error: ErrorApiData;
};

type UpgradeFailedInvalidTexture = {
    rejected: true;
    reason: "invalidTexture";
    entityType: "character" | "companion";
};

export type UpgradeFailedData = UpgradeFailedErrorData | UpgradeFailedInvalidData | UpgradeFailedInvalidTexture;

export class IoSocketController {
    constructor(private readonly app: TemplatedApp) {
        // Global handler for unhandled Promises
        // The listener never needs to be removed, because we are in a singleton that is never destroyed.
        // eslint-disable-next-line listeners/no-missing-remove-event-listener,listeners/no-inline-function-event-listener
        process.on("unhandledRejection", (reason, promise) => {
            console.error("Unhandled Rejection at:", promise, "reason:", reason);
            Sentry.captureException(reason);
        });

        this.ioConnection();
        if (ADMIN_SOCKETS_TOKEN) {
            this.adminRoomSocket();
        }
    }

    adminRoomSocket(): void {
        this.app.ws<AdminSocketData>("/ws/admin/rooms", {
            upgrade: (res, req, context) => {
                const websocketKey = req.getHeader("sec-websocket-key");
                const websocketProtocol = req.getHeader("sec-websocket-protocol");
                const websocketExtensions = req.getHeader("sec-websocket-extensions");

                res.upgrade<AdminSocketData>(
                    {
                        adminConnections: new Map(),
                        disconnecting: false,
                    },
                    websocketKey,
                    websocketProtocol,
                    websocketExtensions,
                    context
                );
            },
            open: (ws) => {
                console.info(
                    "Admin socket connect to client on " + Buffer.from(ws.getRemoteAddressAsText()).toString()
                );
                ws.getUserData().disconnecting = false;
            },
            message: (ws, arrayBuffer): void => {
                try {
                    const message: AdminMessageInterface = JSON.parse(
                        new TextDecoder("utf-8").decode(new Uint8Array(arrayBuffer))
                    );

                    try {
                        isAdminMessageInterface.parse(message);
                    } catch (err) {
                        if (err instanceof z.ZodError) {
                            console.error(err.issues);
                            Sentry.captureException(err.issues);
                        }
                        Sentry.captureException(`Invalid message received. ${JSON.stringify(message)}`);
                        console.error("Invalid message received.", message);
                        ws.send(
                            JSON.stringify({
                                type: "Error",
                                data: {
                                    message: "Invalid message received! The connection has been closed.",
                                },
                            })
                        );
                        ws.end(1007, "Invalid message received!");
                        return;
                    }

                    const token = message.jwt;

                    let data: AdminSocketTokenData;

                    try {
                        data = jwtTokenManager.verifyAdminSocketToken(token);
                    } catch (e) {
                        console.error("Admin socket access refused for token: " + token, e);
                        ws.send(
                            JSON.stringify({
                                type: "Error",
                                data: {
                                    message: "Admin socket access refused! The connection has been closed.",
                                },
                            })
                        );
                        ws.end(1008, "Access refused");
                        return;
                    }

                    const authorizedRoomIds = data.authorizedRoomIds;

                    if (message.event === "listen") {
                        const notAuthorizedRoom = message.roomIds.filter(
                            (roomId) => !authorizedRoomIds.includes(roomId)
                        );

                        if (notAuthorizedRoom.length > 0) {
                            const errorMessage = `Admin socket refused for client on ${Buffer.from(
                                ws.getRemoteAddressAsText()
                            ).toString()} listening of : \n${JSON.stringify(notAuthorizedRoom)}`;
                            Sentry.captureException(errorMessage);
                            console.error(errorMessage);
                            ws.send(
                                JSON.stringify({
                                    type: "Error",
                                    data: {
                                        message: errorMessage,
                                    },
                                })
                            );
                            ws.end(1008, "Access refused");
                            return;
                        }

                        for (const roomId of message.roomIds) {
                            socketManager.handleAdminRoom(ws, roomId).catch((e) => {
                                console.error(e);
                                Sentry.captureException(e);
                            });
                        }
                    } else if (message.event === "user-message") {
                        const messageToEmit = message.message;
                        // Get roomIds of the world where we want broadcast the message
                        const roomIds = authorizedRoomIds.filter(
                            (authorizeRoomId) => authorizeRoomId.split("/")[5] === message.world
                        );

                        for (const roomId of roomIds) {
                            if (messageToEmit.type === "banned") {
                                socketManager
                                    .emitBan(messageToEmit.userUuid, messageToEmit.message, messageToEmit.type, roomId)
                                    .catch((error) => {
                                        Sentry.captureException(error);
                                        console.error(error);
                                    });
                            } else if (messageToEmit.type === "ban") {
                                socketManager
                                    .emitSendUserMessage(
                                        messageToEmit.userUuid,
                                        messageToEmit.message,
                                        messageToEmit.type,
                                        roomId
                                    )
                                    .catch((error) => {
                                        Sentry.captureException(error);
                                        console.error(error);
                                    });
                            }
                        }
                    }
                } catch (err) {
                    Sentry.captureException(err);
                    console.error(err);
                }
            },
            close: (ws) => {
                try {
                    ws.getUserData().disconnecting = true;
                    socketManager.leaveAdminRoom(ws);
                } catch (e) {
                    Sentry.captureException(`An error occurred on admin "disconnect" ${e}`);
                    console.error(`An error occurred on admin "disconnect" ${e}`);
                }
            },
        });
    }

    ioConnection(): void {
        this.app.ws<SocketData | UpgradeFailedData>("/ws/room", {
            /* Options */
            //compression: uWS.SHARED_COMPRESSOR,
            idleTimeout: SOCKET_IDLE_TIMER,
            maxPayloadLength: 16 * 1024 * 1024,
            maxBackpressure: 65536, // Maximum 64kB of data in the buffer.
            upgrade: (res, req, context) => {
                (async () => {
                    /* Keep track of abortions */
                    const upgradeAborted = { aborted: false };

                    res.onAborted(() => {
                        /* We can simply signal that we were aborted */
                        upgradeAborted.aborted = true;
                    });

                    const query = validateWebsocketQuery(
                        req,
                        res,
                        context,
                        z.object({
                            roomId: z.string(),
                            name: z.string(),
                            characterTextureIds: z.union([z.string(), z.string().array()]).optional(),
                            x: z.coerce.number(),
                            y: z.coerce.number(),
                            top: z.coerce.number(),
                            bottom: z.coerce.number(),
                            left: z.coerce.number(),
                            right: z.coerce.number(),
                            companionTextureId: z.string().optional(),
                            availabilityStatus: z.coerce.number(),
                            lastCommandId: z.string().optional(),
                            version: z.string(),
                            chatID: z.string(),
                            roomName: z.string(),
                            cameraState: z.string().transform((val) => val === "true"),
                            microphoneState: z.string().transform((val) => val === "true"),
                        })
                    );

                    if (query === undefined) {
                        return;
                    }

                    debug(
                        `FrontController => [${req.getMethod()}] ${req.getUrl()} — IP: ${req.getHeader(
                            "x-forwarded-for"
                        )} — Time: ${Date.now()}`
                    );

                    const websocketKey = req.getHeader("sec-websocket-key");
                    const websocketProtocol = req.getHeader("sec-websocket-protocol");
                    // We abuse the protocol header to pass the JWT token (to avoid sending it in the query string)
                    const token = websocketProtocol;
                    const websocketExtensions = req.getHeader("sec-websocket-extensions");
                    const ipAddress = req.getHeader("x-forwarded-for");
                    const locale = req.getHeader("accept-language");

                    const {
                        roomId,
                        x,
                        y,
                        top,
                        bottom,
                        left,
                        right,
                        name,
                        availabilityStatus,
                        lastCommandId,
                        version,
                        companionTextureId,
                        roomName,
                        cameraState,
                        microphoneState,
                    } = query;

                    const chatID = query.chatID ? query.chatID : undefined;

                    try {
                        if (version !== apiVersionHash) {
                            if (upgradeAborted.aborted) {
                                // If the response points to nowhere, don't attempt an upgrade
                                return;
                            }
                            return res.upgrade(
                                {
                                    rejected: true,
                                    reason: "error",
                                    error: {
                                        status: "error",
                                        type: "retry",
                                        title: "Please refresh",
                                        subtitle: "New version available",
                                        image: "/resources/icons/new_version.png",
                                        imageLogo: "/static/images/logo.png",
                                        code: "NEW_VERSION",
                                        details:
                                            "A new version of WorkAdventure is available. Please refresh your window",
                                        canRetryManual: true,
                                        buttonTitle: "Refresh",
                                        timeToRetry: 999999,
                                    },
                                } satisfies UpgradeFailedData,
                                websocketKey,
                                websocketProtocol,
                                websocketExtensions,
                                context
                            );
                        }

                        const characterTextureIds: string[] =
                            query.characterTextureIds === undefined
                                ? []
                                : typeof query.characterTextureIds === "string"
                                ? [query.characterTextureIds]
                                : query.characterTextureIds;

                        const tokenData = token ? jwtTokenManager.verifyJWTToken(token) : null;

                        if (DISABLE_ANONYMOUS && !tokenData) {
                            throw new Error("Expecting token");
                        }

                        const userIdentifier = tokenData ? tokenData.identifier : "";
                        const isLogged = !!tokenData?.accessToken;

                        let memberTags: string[] = [];
                        let memberVisitCardUrl: string | null = null;
                        let memberUserRoomToken: string | undefined;
                        let userData: FetchMemberDataByUuidResponse = {
                            status: "ok",
                            email: userIdentifier,
                            userUuid: userIdentifier,
                            tags: tokenData?.tags ?? [],
                            visitCardUrl: null,
                            isCharacterTexturesValid: true,
                            characterTextures: [],
                            isCompanionTextureValid: true,
                            companionTexture: undefined,
                            messages: [],
                            userRoomToken: undefined,
                            activatedInviteUser: true,
                            canEdit: false,
                            world: "",
                            chatID,
                        };

                        let characterTextures: WokaDetail[];
                        let companionTexture: CompanionDetail | undefined;

                        try {
                            try {
                                userData = await adminService.fetchMemberDataByUuid(
                                    userIdentifier,
                                    tokenData?.accessToken,
                                    roomId,
                                    ipAddress,
                                    characterTextureIds,
                                    companionTextureId,
                                    locale,
                                    userData.tags,
                                    chatID
                                );

                                if (userData.status === "ok" && !userData.isCharacterTexturesValid) {
                                    return res.upgrade(
                                        {
                                            rejected: true,
                                            reason: "invalidTexture",
                                            entityType: "character",
                                        } satisfies UpgradeFailedInvalidTexture,
                                        websocketKey,
                                        websocketProtocol,
                                        websocketExtensions,
                                        context
                                    );
                                }
                                if (userData.status === "ok" && !userData.isCompanionTextureValid) {
                                    return res.upgrade(
                                        {
                                            rejected: true,
                                            reason: "invalidTexture",
                                            entityType: "companion",
                                        } satisfies UpgradeFailedInvalidTexture,
                                        websocketKey,
                                        websocketProtocol,
                                        websocketExtensions,
                                        context
                                    );
                                }

                                if (userData.status !== "ok") {
                                    if (upgradeAborted.aborted) {
                                        // If the response points to nowhere, don't attempt an upgrade
                                        return;
                                    }

                                    return res.upgrade(
                                        {
                                            rejected: true,
                                            reason: "error",
                                            error: userData,
                                        } satisfies UpgradeFailedData,
                                        websocketKey,
                                        websocketProtocol,
                                        websocketExtensions,
                                        context
                                    );
                                }
                            } catch (err) {
                                if (upgradeAborted.aborted) {
                                    // If the response points to nowhere, don't attempt an upgrade
                                    return;
                                }
                                throw err;
                            }
                            memberTags = userData.tags;
                            memberVisitCardUrl = userData.visitCardUrl;
                            characterTextures = userData.characterTextures;
                            companionTexture = userData.companionTexture ?? undefined;
                            memberUserRoomToken = userData.userRoomToken;
                        } catch (e) {
                            console.info(
                                "access not granted for user " + (userIdentifier || "anonymous") + " and room " + roomId
                            );
                            Sentry.captureException(e);
                            console.error(e);
                            throw new Error("User cannot access this world", { cause: e });
                        }

                        if (upgradeAborted.aborted) {
                            console.info("Ouch! Client disconnected before we could upgrade it!");
                            /* You must not upgrade now */
                            return;
                        }

                        const socketData: SocketData = {
                            rejected: false,
                            disconnecting: false,
                            token: token && typeof token === "string" ? token : "",
                            roomId,
                            userId: undefined,
                            userUuid: userData.userUuid,
                            isLogged,
                            ipAddress,
                            name,
                            characterTextures,
                            companionTexture,
                            position: {
                                x: x,
                                y: y,
                                direction: "down",
                                moving: false,
                            },
                            viewport: {
                                top,
                                right,
                                bottom,
                                left,
                            },
                            availabilityStatus,
                            lastCommandId,
                            messages: [],
                            tags: memberTags,
                            visitCardUrl: memberVisitCardUrl,
                            userRoomToken: memberUserRoomToken,
                            activatedInviteUser: userData.activatedInviteUser ?? undefined,
                            applications: userData.applications,
                            canEdit: userData.canEdit ?? false,
                            spaceUserId: "",
                            emitInBatch: (payload: SubMessage): void => {},
                            batchedMessages: {
                                event: "",
                                payload: [],
                            },
                            batchTimeout: null,
                            backConnection: undefined,
                            listenedZones: new Set<string>(),
                            pusherRoom: undefined,
                            spaces: new Set<SpaceName>(),
                            joinSpacesPromise: new Map<SpaceName, Promise<void>>(),
                            chatID,
                            world: userData.world,
                            currentChatRoomArea: [],
                            roomName,
                            microphoneState,
                            cameraState,
                            queryAbortControllers: new Map<number, AbortController>(),
                            keepAliveInterval: undefined,
                        };

                        /* This immediately calls open handler, you must not use res after this call */
                        res.upgrade<SocketData>(
                            socketData,
                            /* Spell these correctly */
                            websocketKey,
                            websocketProtocol,
                            websocketExtensions,
                            context
                        );
                    } catch (e) {
                        if (e instanceof Error) {
                            if (!(e instanceof JsonWebTokenError)) {
                                Sentry.captureException(e);
                                console.error(e);
                            }
                            if (upgradeAborted.aborted) {
                                // If the response points to nowhere, don't attempt an upgrade
                                return;
                            }
                            res.upgrade(
                                {
                                    rejected: true,
                                    reason: e instanceof JsonWebTokenError ? tokenInvalidException : null,
                                    message: e.message,
                                    roomId,
                                } satisfies UpgradeFailedData,
                                websocketKey,
                                websocketProtocol,
                                websocketExtensions,
                                context
                            );
                        } else {
                            if (upgradeAborted.aborted) {
                                // If the response points to nowhere, don't attempt an upgrade
                                return;
                            }
                            res.upgrade(
                                {
                                    rejected: true,
                                    reason: null,
                                    message: "500 Internal Server Error",
                                    roomId,
                                } satisfies UpgradeFailedData,
                                websocketKey,
                                websocketProtocol,
                                websocketExtensions,
                                context
                            );
                        }
                    }
                })().catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
                });
            },
            /* Handlers */
            open: (ws) => {
                (async () => {
                    const socketData = ws.getUserData();
                    debug("WebSocket connection established");
                    if (socketData.rejected === true) {
                        const socket = ws as SocketUpgradeFailed;
                        // If there is a room in the error, let's check if we need to clean it.
                        if ("roomId" in socketData) {
                            socketManager.deleteRoomIfEmptyFromId(socketData.roomId);
                        }

                        if (socketData.reason === tokenInvalidException) {
                            socketManager.emitTokenExpiredMessage(socket);
                        } else if (socketData.reason === "error") {
                            socketManager.emitErrorScreenMessage(socket, socketData.error);
                        } else if (socketData.reason === "invalidTexture") {
                            if (socketData.entityType === "character") {
                                socketManager.emitInvalidCharacterTextureMessage(socket);
                            } else {
                                socketManager.emitInvalidCompanionTextureMessage(socket);
                            }
                        } else {
                            socketManager.emitConnectionErrorMessage(socket, socketData.message.toString());
                        }
                        ws.end(1000, "Error message sent");
                        return;
                    }

                    // Mandatory for typing hint
                    const socket = ws as Socket;

                    socketData.emitInBatch = (payload: SubMessage): void => {
                        emitInBatch(socket, payload);
                    };

                    await socketManager.handleJoinRoom(socket);

                    //get data information and show messages
                    if (socketData.messages && Array.isArray(socketData.messages)) {
                        socketData.messages.forEach((c: unknown) => {
                            const messageToSend = z.object({ type: z.string(), message: z.string() }).parse(c);
                            const bytes = ServerToClientMessageTsProto.encode({
                                message: {
                                    $case: "sendUserMessage",
                                    sendUserMessage: {
                                        type: messageToSend.type,
                                        message: messageToSend.message,
                                    },
                                },
                            }).finish();
                            if (!socketData.disconnecting) {
                                socket.send(bytes, true);
                            }
                        });
                    }

                    // Let's send a ping to keep the connection alive. Note: there is ANOTHER ping/pong mechanism
                    // at the application level, between the front and the back. This other mechanism is in charge
                    // of shutting down the connection when idle. However, because of limitations in the browser
                    // (heavy throttling of setTimeout when tab is in background), that mechanism cannot manage
                    // ping delays lower than 1 minute.
                    // Because there are proxies and load balancers on the path that might cut the connection if
                    // idle for more than ~30 seconds, we need this additional ping/pong mechanism here at the
                    // pusher WebSocket level.

                    socketData.keepAliveInterval = setInterval(() => {
                        if (!socketData.disconnecting) {
                            socket.ping();
                        }
                    }, 25000); // Every 25 seconds

                    // Performance test
                    /*
                    const positionMessage = new PositionMessage();
                    positionMessage.setMoving(true);
                    positionMessage.setX(300);
                    positionMessage.setY(300);
                    positionMessage.setDirection(PositionMessage.Direction.DOWN);

                    const userMovedMessage = new UserMovedMessage();
                    userMovedMessage.setUserid(1);
                    userMovedMessage.setPosition(positionMessage);

                    const subMessage = new SubMessage();
                    subMessage.setUsermovedmessage(userMovedMessage);

                    const startTimestamp2 = Date.now();
                    for (let i = 0; i < 100000; i++) {
                        const batchMessage = new BatchMessage();
                        batchMessage.setEvent("");
                        batchMessage.setPayloadList([
                            subMessage
                        ]);

                        const serverToClientMessage = new ServerToClientMessage();
                        serverToClientMessage.setBatchmessage(batchMessage);

                        client.send(serverToClientMessage.serializeBinary().buffer, true);
                    }
                    const endTimestamp2 = Date.now();

                    const startTimestamp = Date.now();
                    for (let i = 0; i < 100000; i++) {
                        // Let's do a performance test!
                        const bytes = ServerToClientMessageTsProto.encode({
                            message: {
                                $case: "batchMessage",
                                batchMessage: {
                                    event: '',
                                    payload: [
                                        {
                                            message: {
                                                $case: "userMovedMessage",
                                                userMovedMessage: {
                                                    userId: 1,
                                                    position: {
                                                        moving: true,
                                                        x: 300,
                                                        y: 300,
                                                        direction: PositionMessage_Direction.DOWN,
                                                    }
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }).finish();

                        client.send(bytes);
                    }
                    const endTimestamp = Date.now();
                    */
                })().catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
                });
            },
            message: (ws, arrayBuffer): void => {
                const socket = ws as Socket;
                Sentry.withIsolationScope(() => {
                    Sentry.setTag("userUuid", socket.getUserData().userUuid);
                    Sentry.setTag("roomId", socket.getUserData().roomId);
                    Sentry.setTag("world", socket.getUserData().world);
                    (async () => {
                        const message = ClientToServerMessage.decode(new Uint8Array(arrayBuffer));
                        if (!message.message) {
                            console.warn("Empty message received.");
                            return;
                        }

                        switch (message.message.$case) {
                            case "viewportMessage": {
                                socketManager.handleViewport(socket, message.message.viewportMessage);
                                break;
                            }
                            case "userMovesMessage": {
                                socketManager.handleUserMovesMessage(socket, message.message.userMovesMessage);
                                break;
                            }
                            case "playGlobalMessage": {
                                await socketManager.emitPlayGlobalMessage(socket, message.message.playGlobalMessage);
                                break;
                            }
                            case "reportPlayerMessage": {
                                await socketManager.handleReportMessage(socket, message.message.reportPlayerMessage);
                                break;
                            }
                            case "addSpaceFilterMessage": {
                                if (message.message.addSpaceFilterMessage.spaceFilterMessage !== undefined)
                                    message.message.addSpaceFilterMessage.spaceFilterMessage.spaceName = `${
                                        socket.getUserData().world
                                    }.${message.message.addSpaceFilterMessage.spaceFilterMessage.spaceName}`;
                                await socketManager.handleAddSpaceFilterMessage(
                                    socket,
                                    noUndefined(message.message.addSpaceFilterMessage)
                                );
                                break;
                            }
                            case "removeSpaceFilterMessage": {
                                if (message.message.removeSpaceFilterMessage.spaceFilterMessage !== undefined)
                                    message.message.removeSpaceFilterMessage.spaceFilterMessage.spaceName = `${
                                        socket.getUserData().world
                                    }.${message.message.removeSpaceFilterMessage.spaceFilterMessage.spaceName}`;
                                socketManager.handleRemoveSpaceFilterMessage(
                                    socket,
                                    noUndefined(message.message.removeSpaceFilterMessage)
                                );
                                break;
                            }
                            case "setPlayerDetailsMessage": {
                                await socketManager.handleSetPlayerDetails(
                                    socket,
                                    message.message.setPlayerDetailsMessage
                                );
                                break;
                            }

                            case "updateSpaceMetadataMessage": {
                                const isMetadata = z
                                    .record(z.string(), z.unknown())
                                    .safeParse(JSON.parse(message.message.updateSpaceMetadataMessage.metadata));
                                if (!isMetadata.success) {
                                    Sentry.captureException(
                                        `Invalid metadata received. ${message.message.updateSpaceMetadataMessage.metadata}`
                                    );
                                    console.error(
                                        "Invalid metadata received.",
                                        message.message.updateSpaceMetadataMessage.metadata
                                    );
                                    return;
                                }

                                message.message.updateSpaceMetadataMessage.spaceName = `${socket.getUserData().world}.${
                                    message.message.updateSpaceMetadataMessage.spaceName
                                }`;

                                socketManager.handleUpdateSpaceMetadata(
                                    socket,
                                    message.message.updateSpaceMetadataMessage.spaceName,
                                    isMetadata.data
                                );
                                break;
                            }
                            case "updateSpaceUserMessage": {
                                message.message.updateSpaceUserMessage.spaceName = `${socket.getUserData().world}.${
                                    message.message.updateSpaceUserMessage.spaceName
                                }`;

                                await socketManager.handleUpdateSpaceUser(
                                    socket,
                                    message.message.updateSpaceUserMessage
                                );
                                break;
                            }
                            case "updateChatIdMessage": {
                                await socketManager.handleUpdateChatId(
                                    socket,
                                    message.message.updateChatIdMessage.email,
                                    message.message.updateChatIdMessage.chatId
                                );
                                break;
                            }
                            case "leaveChatRoomAreaMessage": {
                                await socketManager.handleLeaveChatRoomArea(
                                    socket,
                                    message.message.leaveChatRoomAreaMessage.roomID
                                );
                                break;
                            }
                            case "queryMessage": {
                                try {
                                    const answerMessage: AnswerMessage = {
                                        id: message.message.queryMessage.id,
                                    };
                                    const abortController = new AbortController();
                                    socket
                                        .getUserData()
                                        .queryAbortControllers.set(message.message.queryMessage.id, abortController);
                                    switch (message.message.queryMessage.query?.$case) {
                                        case "roomTagsQuery": {
                                            await socketManager.handleRoomTagsQuery(
                                                socket,
                                                message.message.queryMessage
                                            );
                                            break;
                                        }
                                        case "embeddableWebsiteQuery": {
                                            await socketManager.handleEmbeddableWebsiteQuery(
                                                socket,
                                                message.message.queryMessage
                                            );
                                            break;
                                        }
                                        case "roomsFromSameWorldQuery": {
                                            await socketManager.handleRoomsFromSameWorldQuery(
                                                socket,
                                                message.message.queryMessage
                                            );
                                            break;
                                        }
                                        case "searchMemberQuery": {
                                            const searchMemberAnswer = await socketManager.handleSearchMemberQuery(
                                                socket,
                                                message.message.queryMessage.query.searchMemberQuery
                                            );
                                            answerMessage.answer = {
                                                $case: "searchMemberAnswer",
                                                searchMemberAnswer: searchMemberAnswer,
                                            };
                                            this.sendAnswerMessage(socket, answerMessage);
                                            break;
                                        }
                                        case "chatMembersQuery": {
                                            const chatMembersAnswer = await socketManager.handleChatMembersQuery(
                                                socket,
                                                message.message.queryMessage.query.chatMembersQuery
                                            );
                                            answerMessage.answer = {
                                                $case: "chatMembersAnswer",
                                                chatMembersAnswer: chatMembersAnswer,
                                            };
                                            this.sendAnswerMessage(socket, answerMessage);
                                            break;
                                        }
                                        case "searchTagsQuery": {
                                            const searchTagsAnswer = await socketManager.handleSearchTagsQuery(
                                                socket,
                                                message.message.queryMessage.query.searchTagsQuery
                                            );
                                            answerMessage.answer = {
                                                $case: "searchTagsAnswer",
                                                searchTagsAnswer,
                                            };
                                            this.sendAnswerMessage(socket, answerMessage);
                                            break;
                                        }
                                        case "iceServersQuery": {
                                            const iceServersAnswer = await socketManager.handleIceServersQuery(socket);
                                            answerMessage.answer = {
                                                $case: "iceServersAnswer",
                                                iceServersAnswer,
                                            };
                                            this.sendAnswerMessage(socket, answerMessage);
                                            break;
                                        }
                                        case "getMemberQuery": {
                                            const getMemberAnswer = await socketManager.handleGetMemberQuery(
                                                message.message.queryMessage.query.getMemberQuery
                                            );
                                            if (!getMemberAnswer) {
                                                answerMessage.answer = {
                                                    $case: "error",
                                                    error: {
                                                        message: "User not found, probably left",
                                                    },
                                                };
                                            } else {
                                                answerMessage.answer = {
                                                    $case: "getMemberAnswer",
                                                    getMemberAnswer,
                                                };
                                            }
                                            this.sendAnswerMessage(socket, answerMessage);
                                            break;
                                        }
                                        case "enterChatRoomAreaQuery": {
                                            try {
                                                await socketManager.handleEnterChatRoomAreaQuery(
                                                    socket,
                                                    message.message.queryMessage.query.enterChatRoomAreaQuery.roomID
                                                );
                                                answerMessage.answer = {
                                                    $case: "enterChatRoomAreaAnswer",
                                                    enterChatRoomAreaAnswer: {},
                                                };
                                            } catch (e) {
                                                console.warn("Error entering chat room area", e);
                                                answerMessage.answer = {
                                                    $case: "error",
                                                    error: {
                                                        message: "Error entering chat room area, try again later 🙏",
                                                    },
                                                };
                                            }
                                            this.sendAnswerMessage(socket, answerMessage);
                                            break;
                                        }
                                        case "oauthRefreshTokenQuery": {
                                            try {
                                                answerMessage.answer = {
                                                    $case: "oauthRefreshTokenAnswer",
                                                    oauthRefreshTokenAnswer:
                                                        await socketManager.handleOauthRefreshTokenQuery(
                                                            message.message.queryMessage.query.oauthRefreshTokenQuery
                                                        ),
                                                };
                                                this.sendAnswerMessage(socket, answerMessage);
                                            } catch (error) {
                                                // The refresh token error could be arrived by anything, so let's just log it and send a generic error to the user.
                                                if (error instanceof AxiosError)
                                                    console.warn(
                                                        `Token refresh failed for access token: ${error.request?.data} with response => `,
                                                        error.request?.data,
                                                        error.response?.status,
                                                        error.response?.data
                                                    );
                                                const answerMessage: AnswerMessage = {
                                                    id: message.message.queryMessage.id,
                                                };
                                                answerMessage.answer = {
                                                    $case: "error",
                                                    error: {
                                                        message:
                                                            "The token refresh failed. Please try to login again to be connected 🙏",
                                                    },
                                                };
                                                this.sendAnswerMessage(socket, answerMessage);
                                            }
                                            break;
                                        }
                                        case "joinSpaceQuery": {
                                            const localSpaceName =
                                                message.message.queryMessage.query.joinSpaceQuery.spaceName;
                                            message.message.queryMessage.query.joinSpaceQuery.spaceName = `${
                                                socket.getUserData().world
                                            }.${message.message.queryMessage.query.joinSpaceQuery.spaceName}`;
                                            await socketManager.handleJoinSpace(
                                                socket,
                                                message.message.queryMessage.query.joinSpaceQuery.spaceName,
                                                localSpaceName,
                                                message.message.queryMessage.query.joinSpaceQuery.filterType,
                                                message.message.queryMessage.query.joinSpaceQuery.propertiesToSync,
                                                {
                                                    signal: abortController.signal,
                                                }
                                            );

                                            answerMessage.answer = {
                                                $case: "joinSpaceAnswer",
                                                joinSpaceAnswer: {
                                                    spaceUserId: socket.getUserData().spaceUserId,
                                                },
                                            };
                                            this.sendAnswerMessage(socket, answerMessage);

                                            break;
                                        }
                                        case "leaveSpaceQuery": {
                                            message.message.queryMessage.query.leaveSpaceQuery.spaceName = `${
                                                socket.getUserData().world
                                            }.${message.message.queryMessage.query.leaveSpaceQuery.spaceName}`;
                                            await socketManager.handleLeaveSpace(
                                                socket,
                                                message.message.queryMessage.query.leaveSpaceQuery.spaceName
                                            );

                                            answerMessage.answer = {
                                                $case: "leaveSpaceAnswer",
                                                leaveSpaceAnswer: {},
                                            };

                                            this.sendAnswerMessage(socket, answerMessage);
                                            break;
                                        }
                                        case "mapStorageJwtQuery": {
                                            answerMessage.answer = {
                                                $case: "mapStorageJwtAnswer",
                                                mapStorageJwtAnswer: {
                                                    jwt: await socketManager.handleMapStorageJwtQuery(socket),
                                                },
                                            };
                                            this.sendAnswerMessage(socket, answerMessage);
                                            break;
                                        }
                                        default: {
                                            socket
                                                .getUserData()
                                                .queryAbortControllers.delete(message.message.queryMessage.id);
                                            socketManager.forwardMessageToBack(socket, message.message);
                                        }
                                    }
                                } catch (error) {
                                    const err = asError(error);
                                    // If the error is due to an abort, don't log it as an error
                                    if (!(err instanceof AbortError)) {
                                        console.error("Error handling query message: ", error);
                                        Sentry.captureException(err);
                                    }
                                    const answerMessage: AnswerMessage = {
                                        id: message.message.queryMessage.id,
                                    };
                                    answerMessage.answer = {
                                        $case: "error",
                                        error: {
                                            message: err.message,
                                        },
                                    };
                                    this.sendAnswerMessage(socket, answerMessage);
                                    socket.getUserData().queryAbortControllers.delete(message.message.queryMessage.id);
                                }
                                break;
                            }
                            case "abortQueryMessage": {
                                const abortController = socket
                                    .getUserData()
                                    .queryAbortControllers.get(message.message.abortQueryMessage.id);
                                if (abortController) {
                                    debug(`Aborting query with id ${message.message.abortQueryMessage.id} locally`);
                                    abortController.abort(new ClientAbortError());
                                } else {
                                    debug(
                                        `Forwarding abort query with id ${message.message.abortQueryMessage.id} to back`
                                    );
                                    // If no abort controller found, it means the query has already been treated or has been forwarded to the back.
                                    // Let's forward the abort message to the back anyway, just in case.
                                    socketManager.forwardMessageToBack(socket, message.message);
                                }
                                break;
                            }
                            case "itemEventMessage":
                            case "variableMessage":
                            case "emotePromptMessage":
                            case "followRequestMessage":
                            case "followConfirmationMessage":
                            case "followAbortMessage":
                            case "lockGroupPromptMessage":
                            case "pingMessage":
                            case "askPositionMessage": {
                                socketManager.forwardMessageToBack(socket, message.message);
                                break;
                            }
                            case "editMapCommandMessage": {
                                socketManager.forwardMessageToBack(socket, message.message);
                                break;
                            }
                            // case "muteParticipantIdMessage": {
                            //     message.message.muteParticipantIdMessage.spaceName = `${socket.getUserData().world}.${
                            //         message.message.muteParticipantIdMessage.spaceName
                            //     }`;
                            //     socketManager.handleMuteParticipantIdMessage(
                            //         socket,
                            //         message.message.muteParticipantIdMessage.spaceName,
                            //         message.message.muteParticipantIdMessage.mutedUserUuid,
                            //         message.message
                            //     );
                            //     break;
                            // }
                            // case "muteVideoParticipantIdMessage": {
                            //     message.message.muteVideoParticipantIdMessage.spaceName = `${socket.getUserData().world}.${
                            //         message.message.muteVideoParticipantIdMessage.spaceName
                            //     }`;
                            //
                            //     socketManager.handleMuteVideoParticipantIdMessage(
                            //         socket,
                            //         message.message.muteVideoParticipantIdMessage.spaceName,
                            //         message.message.muteVideoParticipantIdMessage.mutedUserUuid,
                            //         message.message
                            //     );
                            //     break;
                            // }
                            // case "kickOffUserMessage": {
                            //     message.message.kickOffUserMessage.spaceName = `${socket.getUserData().world}.${
                            //         message.message.kickOffUserMessage.spaceName
                            //     }`;
                            //     socketManager.handleKickOffSpaceUserMessage(
                            //         socket,
                            //         message.message.kickOffUserMessage.spaceName,
                            //         message.message.kickOffUserMessage.userId,
                            //         message.message
                            //     );
                            //     break;
                            // }
                            // case "muteEveryBodyParticipantMessage": {
                            //     message.message.muteEveryBodyParticipantMessage.spaceName = `${
                            //         socket.getUserData().world
                            //     }.${message.message.muteEveryBodyParticipantMessage.spaceName}`;
                            //     socketManager.handleMuteEveryBodyParticipantMessage(
                            //         socket,
                            //         message.message.muteEveryBodyParticipantMessage.spaceName,
                            //         message.message.muteEveryBodyParticipantMessage.senderUserId,
                            //         message.message
                            //     );
                            //     break;
                            // }
                            // case "muteVideoEveryBodyParticipantMessage": {
                            //     message.message.muteVideoEveryBodyParticipantMessage.spaceName = `${
                            //         socket.getUserData().world
                            //     }.${message.message.muteVideoEveryBodyParticipantMessage.spaceName}`;
                            //     socketManager.handleMuteVideoEveryBodyParticipantMessage(
                            //         socket,
                            //         message.message.muteVideoEveryBodyParticipantMessage.spaceName,
                            //         message.message.muteVideoEveryBodyParticipantMessage.userId,
                            //         message.message
                            //     );
                            //     break;
                            // }
                            case "banPlayerMessage": {
                                await socketManager.handleBanPlayerMessage(socket, message.message.banPlayerMessage);
                                break;
                            }

                            case "publicEvent": {
                                message.message.publicEvent.spaceName = `${socket.getUserData().world}.${
                                    message.message.publicEvent.spaceName
                                }`;
                                await socketManager.handlePublicEvent(socket, message.message.publicEvent);
                                break;
                            }
                            case "privateEvent": {
                                message.message.privateEvent.spaceName = `${socket.getUserData().world}.${
                                    message.message.privateEvent.spaceName
                                }`;
                                await socketManager.handlePrivateEvent(socket, message.message.privateEvent);
                                break;
                            }
                            default: {
                                const _exhaustiveCheck: never = message.message;
                            }
                        }

                        /* Ok is false if backpressure was built up, wait for drain */
                        //let ok = ws.send(message, isBinary);
                    })().catch((e) => {
                        // If the error is due to an abort triggered by the client, don't log it as an error and don't send an error message back.
                        if (e instanceof ClientAbortError) {
                            return;
                        }

                        Sentry.captureException(e);
                        console.error("An error occurred while processing a message: ", e);

                        try {
                            if (!socket.getUserData().disconnecting) {
                                socket.send(
                                    ServerToClientMessage.encode({
                                        message: {
                                            $case: "errorMessage",
                                            errorMessage: {
                                                message: "An error occurred in pusher: " + asError(e).message,
                                            },
                                        },
                                    }).finish(),
                                    true
                                );
                            }
                        } catch (error) {
                            Sentry.captureException(error);
                            console.error(error);
                        }
                    });
                });
            },
            drain: (ws) => {
                console.info("WebSocket backpressure: " + ws.getBufferedAmount());
            },
            close: (ws) => {
                const socketData = ws.getUserData();

                if (socketData.rejected === true) {
                    return;
                }

                const socket = ws as Socket;
                socketManager.cleanupSocket(socket);
            },
        });
    }

    private sendAnswerMessage(socket: WebSocket<SocketData>, answerMessage: AnswerMessage) {
        if (socket.getUserData().disconnecting) {
            return;
        }
        // We don't delete the abort controller right away because between the moment where we send the answer
        // and the moment where it is received by the client, the client could send an abort message.
        // So we wait a few seconds before deleting it.
        setTimeout(() => {
            socket.getUserData().queryAbortControllers.delete(answerMessage.id);
        }, 5000);
        socket.send(
            ServerToClientMessage.encode({
                message: {
                    $case: "answerMessage",
                    answerMessage,
                },
            }).finish(),
            true
        );
    }
}
