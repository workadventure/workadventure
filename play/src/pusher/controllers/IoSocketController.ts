import { z } from "zod";
import {
    AnswerMessage,
    apiVersionHash,
    ClientToServerMessage,
    CompanionDetail,
    ErrorApiData,
    noUndefined,
    ServerToClientMessage as ServerToClientMessageTsProto,
    ServerToClientMessage,
    SubMessage,
    WokaDetail,
} from "@workadventure/messages";
import { JsonWebTokenError } from "jsonwebtoken";
import * as Sentry from "@sentry/node";
import { TemplatedApp, WebSocket } from "uWebSockets.js";
import { asError } from "catch-unknown";
import { Deferred } from "ts-deferred";
import Debug from "debug";
import type { AdminSocketTokenData } from "../services/JWTTokenManager";
import { jwtTokenManager, tokenInvalidException } from "../services/JWTTokenManager";
import type { FetchMemberDataByUuidResponse } from "../services/AdminApi";
import { Socket, socketManager, SocketUpgradeFailed } from "../services/SocketManager";
import { ADMIN_SOCKETS_TOKEN, DISABLE_ANONYMOUS, SOCKET_IDLE_TIMER } from "../enums/EnvironmentVariable";
import type { Zone } from "../models/Zone";
import type { AdminSocketData } from "../models/Websocket/AdminSocketData";
import type { AdminMessageInterface } from "../models/Websocket/Admin/AdminMessages";
import { isAdminMessageInterface } from "../models/Websocket/Admin/AdminMessages";
import { adminService } from "../services/AdminService";
import { validateWebsocketQuery } from "../services/QueryValidator";
import { SocketData, SpaceName } from "../models/Websocket/SocketData";
import { emitInBatch } from "../services/IoSocketHelpers";

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
                        Sentry.captureException(`Admin socket access refused for token: ${token} ${e}`);
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
                            throw new Error("User cannot access this world");
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
                            listenedZones: new Set<Zone>(),
                            pusherRoom: undefined,
                            spaces: new Set<SpaceName>(),
                            joinSpacesPromise: new Map<SpaceName, Deferred<void>>(),
                            chatID,
                            world: userData.world,
                            currentChatRoomArea: [],
                            roomName,
                            microphoneState,
                            cameraState,
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
                            await socketManager.handleRemoveSpaceFilterMessage(
                                socket,
                                noUndefined(message.message.removeSpaceFilterMessage)
                            );
                            break;
                        }
                        case "setPlayerDetailsMessage": {
                            await socketManager.handleSetPlayerDetails(socket, message.message.setPlayerDetailsMessage);
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

                            await socketManager.handleUpdateSpaceUser(socket, message.message.updateSpaceUserMessage);
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
                                switch (message.message.queryMessage.query?.$case) {
                                    case "roomTagsQuery": {
                                        await socketManager.handleRoomTagsQuery(socket, message.message.queryMessage);
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
                                    case "getMemberQuery": {
                                        const getMemberAnswer = await socketManager.handleGetMemberQuery(
                                            message.message.queryMessage.query.getMemberQuery
                                        );
                                        answerMessage.answer = {
                                            $case: "getMemberAnswer",
                                            getMemberAnswer,
                                        };
                                        this.sendAnswerMessage(socket, answerMessage);
                                        break;
                                    }
                                    case "enterChatRoomAreaQuery": {
                                        await socketManager.handleEnterChatRoomAreaQuery(
                                            socket,
                                            message.message.queryMessage.query.enterChatRoomAreaQuery.roomID
                                        );

                                        answerMessage.answer = {
                                            $case: "enterChatRoomAreaAnswer",
                                            enterChatRoomAreaAnswer: {},
                                        };

                                        this.sendAnswerMessage(socket, answerMessage);
                                        break;
                                    }
                                    case "oauthRefreshTokenQuery": {
                                        answerMessage.answer = {
                                            $case: "oauthRefreshTokenAnswer",
                                            oauthRefreshTokenAnswer: await socketManager.handleOauthRefreshTokenQuery(
                                                message.message.queryMessage.query.oauthRefreshTokenQuery
                                            ),
                                        };
                                        this.sendAnswerMessage(socket, answerMessage);
                                        break;
                                    }
                                    case "joinSpaceQuery": {
                                        const localSpaceName =
                                            message.message.queryMessage.query.joinSpaceQuery.spaceName;
                                        message.message.queryMessage.query.joinSpaceQuery.spaceName = `${
                                            socket.getUserData().world
                                        }.${message.message.queryMessage.query.joinSpaceQuery.spaceName}`;

                                        try {
                                            await socketManager.handleJoinSpace(
                                                socket,
                                                message.message.queryMessage.query.joinSpaceQuery.spaceName,
                                                localSpaceName,
                                                message.message.queryMessage.query.joinSpaceQuery.filterType,
                                                message.message.queryMessage.query.joinSpaceQuery.propertiesToSync
                                            );

                                            answerMessage.answer = {
                                                $case: "joinSpaceAnswer",
                                                joinSpaceAnswer: {},
                                            };
                                            this.sendAnswerMessage(socket, answerMessage);
                                            socketManager.deleteSpaceIfEmpty(
                                                message.message.queryMessage.query.joinSpaceQuery.spaceName
                                            );
                                        } catch (e) {
                                            socketManager.deleteSpaceIfEmpty(
                                                message.message.queryMessage.query.joinSpaceQuery.spaceName
                                            );
                                            throw e;
                                        }

                                        break;
                                    }
                                    case "leaveSpaceQuery": {
                                        message.message.queryMessage.query.leaveSpaceQuery.spaceName = `${
                                            socket.getUserData().world
                                        }.${message.message.queryMessage.query.leaveSpaceQuery.spaceName}`;
                                        try {
                                            await socketManager.handleLeaveSpace(
                                                socket,
                                                message.message.queryMessage.query.leaveSpaceQuery.spaceName
                                            );

                                            answerMessage.answer = {
                                                $case: "leaveSpaceAnswer",
                                                leaveSpaceAnswer: {},
                                            };

                                            this.sendAnswerMessage(socket, answerMessage);

                                            socketManager.deleteSpaceIfEmpty(
                                                message.message.queryMessage.query.leaveSpaceQuery.spaceName
                                            );
                                        } catch (e) {
                                            socketManager.deleteSpaceIfEmpty(
                                                message.message.queryMessage.query.leaveSpaceQuery.spaceName
                                            );
                                            throw e;
                                        }
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
                                        socketManager.forwardMessageToBack(socket, message.message);
                                    }
                                }
                            } catch (error) {
                                const err = asError(error);
                                Sentry.captureException(err);
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

                        case "requestFullSyncMessage": {
                            message.message.requestFullSyncMessage.spaceName = `${socket.getUserData().world}.${
                                message.message.requestFullSyncMessage.spaceName
                            }`;

                            await socketManager.handleRequestFullSync(socket, message.message.requestFullSyncMessage);

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
                    Sentry.captureException(e);
                    console.error(e);

                    try {
                        socket.send(
                            ServerToClientMessage.encode({
                                message: {
                                    $case: "errorMessage",
                                    errorMessage: {
                                        message: "An error occurred in pusher: " + asError(e).message,
                                    },
                                },
                            }).finish()
                        );
                    } catch (error) {
                        Sentry.captureException(error);
                        console.error(error);
                    }
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
                try {
                    socketData.disconnecting = true;
                    socketManager.leaveRoom(socket);
                    socketManager.leaveSpaces(socket).catch((error) => {
                        console.error(error);
                        Sentry.captureException(error);
                    });
                    socketManager.leaveChatRoomArea(socket).catch((error) => {
                        console.error(error);
                        Sentry.captureException(error);
                    });
                    socketData.currentChatRoomArea = [];
                } catch (e) {
                    Sentry.captureException(`An error occurred on "disconnect" ${e}`);
                    console.error(e);
                }
            },
        });
    }

    private sendAnswerMessage(socket: WebSocket<SocketData>, answerMessage: AnswerMessage) {
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
