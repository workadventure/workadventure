import type HyperExpress from "hyper-express";
import { z } from "zod";
import {
    apiVersionHash,
    ClientToServerMessage,
    ErrorApiData,
    ServerToClientMessage as ServerToClientMessageTsProto,
    SubMessage,
    WokaDetail,
    SpaceFilterMessage,
    SpaceUser,
    CompanionDetail,
} from "@workadventure/messages";
import Jwt, { JsonWebTokenError } from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { JID } from "stanza";
import * as Sentry from "@sentry/node";
import { Color } from "@workadventure/shared-utils";
import type { AdminSocketTokenData } from "../services/JWTTokenManager";
import { jwtTokenManager, tokenInvalidException } from "../services/JWTTokenManager";
import type { FetchMemberDataByUuidResponse } from "../services/AdminApi";
import { Socket, socketManager, SocketUpgradeFailed } from "../services/SocketManager";
import {
    ADMIN_SOCKETS_TOKEN,
    DISABLE_ANONYMOUS,
    EJABBERD_DOMAIN,
    EJABBERD_JWT_SECRET,
    SOCKET_IDLE_TIMER,
} from "../enums/EnvironmentVariable";
import type { Zone } from "../models/Zone";
import type { AdminSocketData } from "../models/Websocket/AdminSocketData";
import type { AdminMessageInterface } from "../models/Websocket/Admin/AdminMessages";
import { isAdminMessageInterface } from "../models/Websocket/Admin/AdminMessages";
import { adminService } from "../services/AdminService";
import { validateWebsocketQuery } from "../services/QueryValidator";
import { SocketData } from "../models/Websocket/SocketData";
import { emitInBatch } from "../services/IoSocketHelpers";

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
    constructor(private readonly app: HyperExpress.compressors.TemplatedApp) {
        this.ioConnection();
        if (ADMIN_SOCKETS_TOKEN) {
            this.adminRoomSocket();
        }
    }

    adminRoomSocket(): void {
        this.app.ws<AdminSocketData>("/admin/rooms", {
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
                        Sentry.captureException(`Invalid message received. ${message}`);
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
        this.app.ws<SocketData | UpgradeFailedData>("/room", {
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
                            token: z.string().optional(),
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
                        })
                    );

                    if (query === undefined) {
                        return;
                    }

                    const websocketKey = req.getHeader("sec-websocket-key");
                    const websocketProtocol = req.getHeader("sec-websocket-protocol");
                    const websocketExtensions = req.getHeader("sec-websocket-extensions");
                    const ipAddress = req.getHeader("x-forwarded-for");
                    const locale = req.getHeader("accept-language");

                    const {
                        roomId,
                        token,
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
                    } = query;

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
                            tags: [],
                            visitCardUrl: null,
                            isCharacterTexturesValid: true,
                            characterTextures: [],
                            isCompanionTextureValid: true,
                            companionTexture: undefined,
                            messages: [],
                            userRoomToken: undefined,
                            jabberId: null,
                            jabberPassword: null,
                            mucRooms: [],
                            activatedInviteUser: true,
                            canEdit: false,
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
                                    locale
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

                        if (!userData.jabberId) {
                            // If there is no admin, or no user, let's log users using JWT tokens
                            userData.jabberId = JID.create({
                                local: userIdentifier,
                                domain: EJABBERD_DOMAIN,
                                resource: uuid(),
                            });
                            if (EJABBERD_JWT_SECRET) {
                                userData.jabberPassword = Jwt.sign({ jid: userData.jabberId }, EJABBERD_JWT_SECRET, {
                                    expiresIn: "1d",
                                    algorithm: "HS256",
                                });
                            } else {
                                userData.jabberPassword = "no_password_set";
                            }
                        } else {
                            userData.jabberId = `${userData.jabberId}/${uuid()}`;
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
                            userJid: userData.jabberId,
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
                            jabberId: userData.jabberId,
                            jabberPassword: userData.jabberPassword,
                            activatedInviteUser: userData.activatedInviteUser || undefined,
                            mucRooms: userData.mucRooms || [],
                            applications: userData.applications,
                            canEdit: userData.canEdit ?? false,
                            spaceUser: SpaceUser.fromPartial({
                                id: 0,
                                uuid: userData.userUuid,
                                name,
                                playUri: roomId,
                                // FIXME : Get room name from admin
                                roomName: "",
                                availabilityStatus,
                                isLogged,
                                color: Color.getColorByString(name),
                                tags: memberTags,
                                cameraState: false,
                                screenSharingState: false,
                                microphoneState: false,
                                megaphoneState: false,
                                characterTextures: characterTextures.map((characterTexture) => ({
                                    url: characterTexture.url,
                                    id: characterTexture.id,
                                })),
                                visitCardUrl: memberVisitCardUrl ?? undefined,
                            }),
                            emitInBatch: (payload: SubMessage): void => {},
                            batchedMessages: {
                                event: "",
                                payload: [],
                            },
                            batchTimeout: null,
                            backConnection: undefined,
                            listenedZones: new Set<Zone>(),
                            pusherRoom: undefined,
                            spaces: [],
                            spacesFilters: new Map<string, SpaceFilterMessage[]>(),
                            cameraState: undefined,
                            microphoneState: undefined,
                            screenSharingState: undefined,
                            megaphoneState: undefined,
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
                            socketManager.emitConnectionErrorMessage(socket, socketData.message);
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

                    socketManager.emitXMPPSettings(socket);

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
                (async () => {
                    const socket = ws as Socket;
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
                            socketManager.handleAddSpaceFilterMessage(socket, message.message.addSpaceFilterMessage);
                            break;
                        }
                        case "updateSpaceFilterMessage": {
                            socketManager.handleUpdateSpaceFilterMessage(
                                socket,
                                message.message.updateSpaceFilterMessage
                            );
                            break;
                        }
                        case "removeSpaceFilterMessage": {
                            socketManager.handleRemoveSpaceFilterMessage(
                                socket,
                                message.message.removeSpaceFilterMessage
                            );
                            break;
                        }
                        case "setPlayerDetailsMessage": {
                            socketManager.handleSetPlayerDetails(socket, message.message.setPlayerDetailsMessage);
                            break;
                        }
                        case "watchSpaceMessage": {
                            void socketManager.handleJoinSpace(
                                socket,
                                message.message.watchSpaceMessage.spaceName,
                                message.message.watchSpaceMessage.spaceFilter
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

                            await socketManager.handleUpdateSpaceMetadata(
                                socket,
                                message.message.updateSpaceMetadataMessage.spaceName,
                                isMetadata.data
                            );
                            break;
                        }
                        case "unwatchSpaceMessage": {
                            void socketManager.handleLeaveSpace(socket, message.message.unwatchSpaceMessage.spaceName);
                            break;
                        }
                        case "cameraStateMessage": {
                            socketManager.handleCameraState(socket, message.message.cameraStateMessage.value);
                            break;
                        }
                        case "microphoneStateMessage": {
                            socketManager.handleMicrophoneState(socket, message.message.microphoneStateMessage.value);
                            break;
                        }
                        case "screenSharingStateMessage": {
                            socketManager.handleScreenSharingState(
                                socket,
                                message.message.screenSharingStateMessage.value
                            );
                            break;
                        }
                        case "megaphoneStateMessage": {
                            socketManager.handleMegaphoneState(socket, message.message.megaphoneStateMessage);
                            break;
                        }
                        case "jitsiParticipantIdSpaceMessage": {
                            socketManager.handleJitsiParticipantIdSpace(
                                socket,
                                message.message.jitsiParticipantIdSpaceMessage.spaceName,
                                message.message.jitsiParticipantIdSpaceMessage.value
                            );
                            break;
                        }
                        case "queryMessage": {
                            switch (message.message.queryMessage.query?.$case) {
                                case "roomTagsQuery": {
                                    void socketManager.handleRoomTagsQuery(socket, message.message.queryMessage);
                                    break;
                                }
                                case "embeddableWebsiteQuery": {
                                    void socketManager.handleEmbeddableWebsiteQuery(
                                        socket,
                                        message.message.queryMessage
                                    );
                                    break;
                                }
                                case "roomsFromSameWorldQuery": {
                                    void socketManager.handleRoomsFromSameWorldQuery(
                                        socket,
                                        message.message.queryMessage
                                    );
                                    break;
                                }
                                default: {
                                    socketManager.forwardMessageToBack(socket, message.message);
                                }
                            }
                            break;
                        }
                        case "itemEventMessage":
                        case "variableMessage":
                        case "webRtcSignalToServerMessage":
                        case "webRtcScreenSharingSignalToServerMessage":
                        case "emotePromptMessage":
                        case "followRequestMessage":
                        case "followConfirmationMessage":
                        case "followAbortMessage":
                        case "lockGroupPromptMessage":
                        case "pingMessage":
                        case "editMapCommandMessage":
                        case "askPositionMessage": {
                            socketManager.forwardMessageToBack(socket, message.message);
                            break;
                        }
                        case "banPlayerMessage": {
                            await socketManager.handleBanPlayerMessage(socket, message.message.banPlayerMessage);
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
                    socketManager.leaveSpaces(socket);
                } catch (e) {
                    Sentry.captureException(`An error occurred on "disconnect" ${e}`);
                    console.error(e);
                }
            },
        });
    }
}
