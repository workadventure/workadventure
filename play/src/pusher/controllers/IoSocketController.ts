import { z } from "zod";
import type { AnswerMessage, CompanionDetail, ErrorApiData, SubMessage, WokaDetail } from "@workadventure/messages";
import { apiVersionHash, noUndefined } from "@workadventure/messages";
import { errors } from "jose";
import * as Sentry from "@sentry/node";
import type { TemplatedApp } from "uWebSockets.js";
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
import type { ConnectingSocketData, SpaceName } from "../models/Websocket/SocketData";
import { emitInBatch } from "../services/IoSocketHelpers";
import { ClientAbortError } from "../models/ClientAbortError";
import { ClientNotPartOfSpaceError, UserAlreadyAddedInSpaceError } from "../models/SpaceValidationErrors";
import { PusherRoomSocketController } from "../services/PusherRoomSocketController";

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
    private readonly roomSocketController: PusherRoomSocketController;

    constructor(private readonly app: TemplatedApp) {
        // Global handler for unhandled Promises
        // The listener never needs to be removed, because we are in a singleton that is never destroyed.
        // eslint-disable-next-line listeners/no-missing-remove-event-listener,listeners/no-inline-function-event-listener
        process.on("unhandledRejection", (reason, promise) => {
            console.error("Unhandled Rejection at:", promise, "reason:", reason);
            Sentry.captureException(reason);
        });

        this.roomSocketController = new PusherRoomSocketController(this.app);

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

                res.cork(() => {
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
                });
            },
            open: (ws) => {
                console.info(
                    "Admin socket connect to client on " + Buffer.from(ws.getRemoteAddressAsText()).toString()
                );
                ws.getUserData().disconnecting = false;
            },
            message: async (ws, arrayBuffer): Promise<void> => {
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
                        data = await jwtTokenManager.verifyAdminSocketToken(token);
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
        this.roomSocketController.ws("/ws/room", {
            /* Options */
            //compression: uWS.SHARED_COMPRESSOR,
            idleTimeout: SOCKET_IDLE_TIMER,
            maxPayloadLength: 16 * 1024 * 1024,
            maxBackpressure: 65536, // Maximum 64kB of data in the buffer.
            queryValidator: z.object({
                roomId: z.string(),
                characterTextureIds: z.union([z.string(), z.string().array()]).optional(),
                companionTextureId: z.string().optional(),
                lastCommandId: z.string().optional(),
                version: z.string(),
                chatID: z.string(),
                roomName: z.string(),
                cameraState: z.string().transform((val) => val === "true"),
                microphoneState: z.string().transform((val) => val === "true"),
                tabId: z.string(),
            }),
            upgrade: async ({ query, request, isAborted, upgrade, reject }) => {
                debug(
                    `FrontController => [${request.method}] ${request.url} — IP: ${
                        request.ipAddress
                    } — Time: ${Date.now()}`
                );

                // We abuse the protocol header to pass the JWT token (to avoid sending it in the query string)
                const token = request.token;
                const ipAddress = request.ipAddress;
                const locale = request.locale;

                const { roomId, lastCommandId, version, companionTextureId, roomName, cameraState, microphoneState } =
                    query;

                const chatID = query.chatID ? query.chatID : undefined;

                try {
                    if (version !== apiVersionHash) {
                        if (isAborted()) {
                            // If the response points to nowhere, don't attempt an upgrade
                            return;
                        }
                        reject({
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
                                details: "A new version of WorkAdventure is available. Please refresh your window",
                                canRetryManual: true,
                                buttonTitle: "Refresh",
                                timeToRetry: 999999,
                            },
                        } satisfies UpgradeFailedData);
                        return;
                    }

                    const characterTextureIds: string[] =
                        query.characterTextureIds === undefined
                            ? []
                            : typeof query.characterTextureIds === "string"
                            ? [query.characterTextureIds]
                            : query.characterTextureIds;

                    const tokenData = token ? await jwtTokenManager.verifyJWTToken(token) : null;

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
                        canRecord: false,
                    };

                    let characterTextures: WokaDetail[];
                    let companionTexture: CompanionDetail | undefined;

                    try {
                        try {
                            const memberTagsFromToken = userData.tags;
                            userData = await adminService.fetchMemberDataByUuid(
                                userIdentifier,
                                tokenData?.accessToken,
                                roomId,
                                ipAddress,
                                characterTextureIds,
                                companionTextureId,
                                locale,
                                memberTagsFromToken,
                                chatID
                            );

                            if (userData.status === "ok" && !userData.isCharacterTexturesValid) {
                                reject({
                                    rejected: true,
                                    reason: "invalidTexture",
                                    entityType: "character",
                                } satisfies UpgradeFailedInvalidTexture);
                                return;
                            }
                            if (userData.status === "ok" && !userData.isCompanionTextureValid) {
                                reject({
                                    rejected: true,
                                    reason: "invalidTexture",
                                    entityType: "companion",
                                } satisfies UpgradeFailedInvalidTexture);
                                return;
                            }

                            if (userData.status !== "ok") {
                                if (isAborted()) {
                                    // If the response points to nowhere, don't attempt an upgrade
                                    return;
                                }

                                const errorData = userData;
                                reject({
                                    rejected: true,
                                    reason: "error",
                                    error: errorData,
                                } satisfies UpgradeFailedData);
                                return;
                            }
                        } catch (err) {
                            if (isAborted()) {
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

                    if (isAborted()) {
                        console.info("Ouch! Client disconnected before we could upgrade it!");
                        /* You must not upgrade now */
                        return;
                    }

                    console.info(`Upgrading connection to WebSocket for tab ${query.tabId}`);

                    const socketData: ConnectingSocketData = {
                        rejected: false,
                        disconnecting: false,
                        token: token && typeof token === "string" ? token : "",
                        roomId,
                        userId: undefined,
                        userUuid: userData.userUuid,
                        isLogged,
                        ipAddress,
                        characterTextures,
                        companionTexture,
                        lastCommandId,
                        tags: memberTags,
                        visitCardUrl: memberVisitCardUrl,
                        userRoomToken: memberUserRoomToken,
                        loginMessages: userData.messages,
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
                        tabId: query.tabId,
                        attendeesState: false,
                        queryAbortControllers: new Map<number, AbortController>(),
                        canRecord: userData.canRecord ?? false,
                        keepAliveInterval: undefined,
                    };

                    /* This immediately calls open handler, you must not use res after this call */
                    upgrade(socketData);
                } catch (e) {
                    if (e instanceof errors.JWTInvalid || e instanceof errors.JWTExpired) {
                        reject({
                            rejected: true,
                            reason: tokenInvalidException,
                            message: e.message,
                            roomId,
                        } satisfies UpgradeFailedData);
                        return;
                    }
                    throw e;
                }
            },
            /* Handlers */
            rejectedOpen: (socket: SocketUpgradeFailed): void => {
                const socketData = socket.getUserData();
                debug("Rejected WebSocket connection established");

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

                socket.end(1000, "Error message sent");
            },
            open: async (socket) => {
                const socketData = socket.getUserData();
                debug("WebSocket connection established");

                // TODO: move the batching mechanism inside the PusherWebSocket
                socketData.emitInBatch = (payload: SubMessage): void => {
                    emitInBatch(socket, payload);
                };

                await socketManager.handleConnectToRoom(socket);

                for (const loginMessage of socketData.loginMessages) {
                    socket.send({
                        message: {
                            $case: "sendUserMessage",
                            sendUserMessage: loginMessage,
                        },
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

                // TODO: move the keep-alive mechanism inside the PusherWebSocket
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
            },
            message: (socket, message): void => {
                Sentry.withIsolationScope(() => {
                    const userData = socket.getUserData();
                    Sentry.setTag("userUuid", userData.userUuid);
                    Sentry.setTag("roomId", userData.roomId);
                    Sentry.setTag("world", userData.world);
                    (async () => {
                        if (!message.message) {
                            console.warn("Empty message received.");
                            return;
                        }

                        switch (message.message.$case) {
                            case "joinRoomFrontMessage": {
                                await socketManager.handleJoinRoom(socket, message.message.joinRoomFrontMessage);
                                break;
                            }
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
                                    message.message.addSpaceFilterMessage.spaceFilterMessage.spaceName = `${userData.world}.${message.message.addSpaceFilterMessage.spaceFilterMessage.spaceName}`;
                                await socketManager.handleAddSpaceFilterMessage(
                                    socket,
                                    noUndefined(message.message.addSpaceFilterMessage)
                                );
                                break;
                            }
                            case "removeSpaceFilterMessage": {
                                if (message.message.removeSpaceFilterMessage.spaceFilterMessage !== undefined)
                                    message.message.removeSpaceFilterMessage.spaceFilterMessage.spaceName = `${userData.world}.${message.message.removeSpaceFilterMessage.spaceFilterMessage.spaceName}`;
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

                                message.message.updateSpaceMetadataMessage.spaceName = `${userData.world}.${message.message.updateSpaceMetadataMessage.spaceName}`;

                                socketManager.handleUpdateSpaceMetadata(
                                    socket,
                                    message.message.updateSpaceMetadataMessage.spaceName,
                                    isMetadata.data
                                );
                                break;
                            }
                            case "updateSpaceUserMessage": {
                                message.message.updateSpaceUserMessage.spaceName = `${userData.world}.${message.message.updateSpaceUserMessage.spaceName}`;

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
                                    userData.queryAbortControllers.set(
                                        message.message.queryMessage.id,
                                        abortController
                                    );
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
                                        case "getRecordingsQuery": {
                                            const getRecordingsAnswer = await socketManager.handleGetRecordingsQuery(
                                                socket
                                            );
                                            answerMessage.answer = {
                                                $case: "getRecordingsAnswer",
                                                getRecordingsAnswer,
                                            };
                                            this.sendAnswerMessage(socket, answerMessage);
                                            break;
                                        }
                                        case "deleteRecordingQuery": {
                                            const deleteRecordingAnswer =
                                                await socketManager.handleDeleteRecordingQuery(
                                                    socket,
                                                    message.message.queryMessage.query.deleteRecordingQuery.recordingId
                                                );
                                            answerMessage.answer = {
                                                $case: "deleteRecordingAnswer",
                                                deleteRecordingAnswer,
                                            };
                                            this.sendAnswerMessage(socket, answerMessage);
                                            break;
                                        }
                                        case "getSignedUrlQuery": {
                                            const getSignedUrlAnswer = await socketManager.handleGetSignedUrlQuery(
                                                socket,
                                                message.message.queryMessage.query.getSignedUrlQuery.key
                                            );

                                            answerMessage.answer = {
                                                $case: "getSignedUrlAnswer",
                                                getSignedUrlAnswer,
                                            };

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
                                        case "startRecordingQuery": {
                                            const localSpaceName =
                                                message.message.queryMessage.query.startRecordingQuery.spaceName;
                                            const worldSpaceName = `${userData.world}.${localSpaceName}`;

                                            await socketManager.handleStartRecording(socket, worldSpaceName, {
                                                signal: abortController.signal,
                                            });

                                            answerMessage.answer = {
                                                $case: "startRecordingAnswer",
                                                startRecordingAnswer: {},
                                            };
                                            this.sendAnswerMessage(socket, answerMessage);
                                            userData.queryAbortControllers.delete(message.message.queryMessage.id);
                                            break;
                                        }
                                        case "stopRecordingQuery": {
                                            const localSpaceName =
                                                message.message.queryMessage.query.stopRecordingQuery.spaceName;
                                            const worldSpaceName = `${userData.world}.${localSpaceName}`;

                                            await socketManager.handleStopRecording(socket, worldSpaceName, {
                                                signal: abortController.signal,
                                            });

                                            answerMessage.answer = {
                                                $case: "stopRecordingAnswer",
                                                stopRecordingAnswer: {},
                                            };
                                            this.sendAnswerMessage(socket, answerMessage);
                                            userData.queryAbortControllers.delete(message.message.queryMessage.id);
                                            break;
                                        }
                                        case "joinSpaceQuery": {
                                            const localSpaceName =
                                                message.message.queryMessage.query.joinSpaceQuery.spaceName;
                                            message.message.queryMessage.query.joinSpaceQuery.spaceName = `${userData.world}.${message.message.queryMessage.query.joinSpaceQuery.spaceName}`;
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
                                                    spaceUserId: userData.spaceUserId,
                                                },
                                            };
                                            this.sendAnswerMessage(socket, answerMessage);

                                            break;
                                        }
                                        case "leaveSpaceQuery": {
                                            message.message.queryMessage.query.leaveSpaceQuery.spaceName = `${userData.world}.${message.message.queryMessage.query.leaveSpaceQuery.spaceName}`;
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
                                            userData.queryAbortControllers.delete(message.message.queryMessage.id);
                                            socketManager.forwardMessageToBack(socket, message.message);
                                        }
                                    }
                                } catch (error) {
                                    const err = asError(error);
                                    const queryType = message.message.queryMessage.query?.$case ?? "unknown";
                                    // If the error is due to an abort, don't log it as an error
                                    if (!(err instanceof AbortError)) {
                                        console.error(
                                            "Error handling query message:",
                                            {
                                                queryType,
                                                queryId: message.message.queryMessage.id,
                                                userUuid: userData.userUuid,
                                                roomId: userData.roomId,
                                                world: userData.world,
                                            },
                                            error
                                        );

                                        // Expected join-space validation error: do not send to Sentry.
                                        if (!(err instanceof UserAlreadyAddedInSpaceError)) {
                                            Sentry.captureException(err, {
                                                extra: {
                                                    queryType,
                                                    queryId: message.message.queryMessage.id,
                                                },
                                                tags: {
                                                    queryType,
                                                },
                                            });
                                        }
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
                                    userData.queryAbortControllers.delete(message.message.queryMessage.id);
                                }
                                break;
                            }
                            case "abortQueryMessage": {
                                const abortController = userData.queryAbortControllers.get(
                                    message.message.abortQueryMessage.id
                                );
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
                            case "setAreaPropertyVariableMessage":
                            case "emotePromptMessage":
                            case "followRequestMessage":
                            case "followConfirmationMessage":
                            case "followAbortMessage":
                            case "lockGroupPromptMessage":
                            case "pingMessage":
                            case "askPositionMessage":
                            case "meetingInvitationRequestMessage":
                            case "meetingInvitationResponseMessage": {
                                socketManager.forwardMessageToBack(socket, message.message);
                                break;
                            }
                            case "editMapCommandMessage": {
                                socketManager.forwardMessageToBack(socket, message.message);
                                break;
                            }
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
                            case "backEvent": {
                                message.message.backEvent.spaceName = `${socket.getUserData().world}.${
                                    message.message.backEvent.spaceName
                                }`;

                                await socketManager.handleBackEvent(socket, message.message.backEvent);
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
                        // Expected validation error: client not part of space; do not send to Sentry but still notify the client.
                        if (!(e instanceof ClientNotPartOfSpaceError)) {
                            Sentry.captureException(e);
                        }
                        console.error("An error occurred while processing a message: ", e);

                        try {
                            if (!userData.disconnecting) {
                                socket.send({
                                    message: {
                                        $case: "errorMessage",
                                        errorMessage: {
                                            message: "An error occurred in pusher: " + asError(e).message,
                                        },
                                    },
                                });
                            }
                        } catch (error) {
                            Sentry.captureException(error);
                            console.error(error);
                        }
                    });
                });
            },
            drain: (socket) => {
                console.info("WebSocket backpressure: " + socket.getBufferedAmount());
            },
            close: (socket) => {
                socketManager.cleanupSocket(socket);
            },
        });
    }

    private sendAnswerMessage(socket: Socket, answerMessage: AnswerMessage) {
        if (socket.getUserData().disconnecting) {
            // Avoid leaking Map entries when we bail out before scheduling the delayed delete below.
            socket.getUserData().queryAbortControllers.delete(answerMessage.id);
            return;
        }
        // We don't delete the abort controller right away because between the moment where we send the answer
        // and the moment where it is received by the client, the client could send an abort message.
        // So we wait a few seconds before deleting it.
        setTimeout(() => {
            socket.getUserData().queryAbortControllers.delete(answerMessage.id);
        }, 5000);
        socket.send({
            message: {
                $case: "answerMessage",
                answerMessage,
            },
        });
    }
}
