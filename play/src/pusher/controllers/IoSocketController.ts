import { isAxiosError } from "axios";
import type HyperExpress from "hyper-express";
import { z } from "zod";
import {
    apiVersionHash,
    AvailabilityStatus,
    ClientToServerMessage,
    CompanionTextureMessage,
    ErrorApiData,
    MucRoomDefinition,
    ServerToClientMessage as ServerToClientMessageTsProto,
    SubMessage,
    WokaDetail,
    ApplicationDefinitionInterface,
    SpaceFilterMessage,
    SpaceUser,
    CompanionDetail,
} from "@workadventure/messages";
import Jwt, { JsonWebTokenError } from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { JID } from "stanza";
import * as Sentry from "@sentry/node";
import { Color } from "@workadventure/shared-utils";
import { PointInterface } from "../models/websocket/PointInterface";
import type { AdminSocketTokenData } from "../services/JWTTokenManager";
import { jwtTokenManager, tokenInvalidException } from "../services/JWTTokenManager";
import type { FetchMemberDataByUuidResponse } from "../services/AdminApi";
import { socketManager } from "../services/SocketManager";
import { emitInBatch } from "../services/IoSocketHelpers";
import {
    ADMIN_SOCKETS_TOKEN,
    DISABLE_ANONYMOUS,
    EJABBERD_DOMAIN,
    EJABBERD_JWT_SECRET,
    SOCKET_IDLE_TIMER,
} from "../enums/EnvironmentVariable";
import type { Zone } from "../models/Zone";
import type { AdminSocketData } from "../models/websocket/AdminSocketData";
import type { AdminMessageInterface } from "../models/websocket/Admin/AdminMessages";
import { isAdminMessageInterface } from "../models/websocket/Admin/AdminMessages";
import { adminService } from "../services/AdminService";
import { validateWebsocketQuery } from "../services/QueryValidator";
import { Namespace, Server as SocketServer } from "socket.io";
import {
    FailedErrorData,
    FailedInvalidData,
    FailedInvalidTextureData,
    SocketData,
    UserSocketData,
} from "../models/websocket/SocketData";
import {
    AdminRoomClientToServerEvents,
    AdminRoomInterServerEvents,
    AdminRoomServerToClientEvents,
    AdminRoomSocketData,
} from "../models/websocket/namespaces/admin-room/AdminRoomNamespace";
import AdminRoomAuthenticatedMiddleware from "../models/websocket/middlewares/AdminRoomAuthenticatedMiddleware";
import { UserMessageC2SEvent } from "../models/websocket/namespaces/admin-room/client-to-server-events/UserMessageC2SEvent";
import { ListenC2SEvent } from "../models/websocket/namespaces/admin-room/client-to-server-events/ListenC2SEvent";
import MessageValidatorMiddleware from "../models/websocket/middlewares/MessageValidatorMiddleware";
import { RoomClientToServerEvents, RoomInterServerEvents, RoomServerToClientEvents, RoomSocketData } from "../models/websocket/namespaces/room/RoomNamespace";
import { QueryRoomNamespace } from "../models/websocket/namespaces/room/QueryRoomNamespace";

/**
 * The object passed between the "open" and the "upgrade" methods when opening a websocket
 */
// type UpgradeData = {
//     // Data passed here is accessible on the "websocket" socket object.
//     rejected: false;
//     token: string;
//     userUuid: string;
//     userJid: string;
//     IPAddress: string;
//     userIdentifier: string;
//     roomId: string;
//     name: string;
//     companionTexture?: CompanionTextureMessage;
//     availabilityStatus: AvailabilityStatus;
//     lastCommandId?: string;
//     messages: unknown[];
//     tags: string[];
//     visitCardUrl: string | null;
//     userRoomToken?: string;
//     characterTextures: WokaDetail[];
//     jabberId?: string;
//     jabberPassword?: string | null;
//     applications?: ApplicationDefinitionInterface[] | null;
//     position: PointInterface;
//     viewport: {
//         top: number;
//         right: number;
//         bottom: number;
//         left: number;
//     };
//     mucRooms?: MucRoomDefinition[];
//     activatedInviteUser?: boolean;
//     isLogged: boolean;
//     canEdit: boolean;
//     spaceUser: SpaceUser;
// };

export class IoSocketController {
    constructor(private readonly app: SocketServer) {
        this.ioConnection();
        if (ADMIN_SOCKETS_TOKEN) {
            this.adminRoomNamespace();
        }
    }

    // Admin room namespace
    adminRoomNamespace(): void {
        // Initialize admin room namespace
        const adminRoomNamespace: Namespace<
            AdminRoomClientToServerEvents,
            AdminRoomServerToClientEvents,
            AdminRoomInterServerEvents,
            AdminRoomSocketData
        > = this.app.of("/admin/rooms")
        .use(AdminRoomAuthenticatedMiddleware)
        .use(MessageValidatorMiddleware(AdminRoomClientToServerEvents));

        // Listen for new connections
        adminRoomNamespace.on("connection", (socket) => {
            console.info(`Admin socket connect to client on ${socket.handshake.address}`);

            // Listen for disconnections
            socket.on("disconnect", (reason) => {
                console.info(`Admin socket disconnect to client on ${socket.handshake.address} for reason ${reason}`);
                try {
                    // Leave all rooms
                    socketManager.leaveAdminRoom(socket);
                } catch (e) {
                    Sentry.captureException(`An error occurred on admin "disconnect" ${e}`);
                    console.error(`An error occurred on admin "disconnect" ${e}`);
                }
            });

            socket.on("listen", (data) => {
                try {
                    const token = socket.handshake.auth.token;
                    const tokenPayload = jwtTokenManager.getTokenPayload(token);
                    const authorizedRoomIds = tokenPayload.authorizedRoomIds;

                    const notAuthorizedRoom = data.roomIds.filter((roomId) => !authorizedRoomIds.includes(roomId));

                    if (notAuthorizedRoom.length > 0) {
                        const errorMessage = `Admin socket refused for client on ${
                            socket.handshake.address
                        } listening of : \n${JSON.stringify(notAuthorizedRoom)}`;
                        Sentry.captureException(errorMessage);
                        console.error(errorMessage);
                        socket.emit("error", {
                            message: errorMessage,
                        });
                        socket.disconnect(true);
                        return;
                    }

                    for (const roomId of data.roomIds) {
                        socketManager.handleAdminRoom(socket, roomId).catch((e) => {
                            console.error(e);
                            Sentry.captureException(e);
                        });
                    }
                } catch (error) {
                    Sentry.captureException(error);
                    console.error(error);
                }
            });

            socket.on("user-message", (data) => {
                try {
                    const token = socket.handshake.auth.token;
                    const tokenPayload = jwtTokenManager.getTokenPayload(token);
                    const authorizedRoomIds = tokenPayload.authorizedRoomIds;

                    const messageToEmit = data.message;
                    // Get roomIds of the world where we want broadcast the message
                    const roomIds = authorizedRoomIds.filter(
                        (authorizeRoomId) => authorizeRoomId.split("/")[5] === data.world
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
                } catch (error) {
                    Sentry.captureException(error);
                    console.error(error);
                }
            });
        });
    }

    ioConnection(): void {
        const roomNamespace: Namespace<
            RoomClientToServerEvents,
            RoomServerToClientEvents,
            RoomInterServerEvents,
            RoomSocketData
        > = this.app.of("/admin/rooms")
        .use(MessageValidatorMiddleware(RoomClientToServerEvents));

        roomNamespace.on("connection", (socket) => {
            console.info(`Socket connect to client on ${socket.handshake.address}`);

            (async () => {
                let queryData: QueryRoomNamespace;

                try {
                    queryData = QueryRoomNamespace.parse(socket.handshake.query);
                } catch (error) {
                    let messages =  error instanceof z.ZodError ?
                        error.issues.map((issue) => "Parameter " + issue.path + ": " + issue.message) :
                        ["Unknown error"];

                    socket.emit("error", {
                        reason: "error",
                        status: 400,
                        error: {
                            type: "error",
                            title: "400 Bad Request",
                            subtitle: "Something wrong while connection!",
                            image: "",
                            code: "WS_BAD_REQUEST",
                            details: messages.join("\n"),
                        },
                    });

                    socket.disconnect(true);
                    return;
                }

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
                } = queryData;

                try {
                    if (version !== apiVersionHash) {
                        socket.emit("error", {
                            reason: "error",
                            status: 419,
                            error: {
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
                        });
                    }

                    const ipAddress = socket.handshake.headers["x-forwarded-for"]?.[0] || socket.handshake.address;
                    const locale = socket.handshake.headers["accept-language"] || "";

                    const characterTextureIds: string[] =
                        typeof queryData.characterTextureIds === "string"
                            ? [queryData.characterTextureIds]
                            : queryData.characterTextureIds;
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
                                email: userIdentifier,
                                userUuid: userIdentifier,
                                tags: [],
                                visitCardUrl: null,
                                characterTextures: [],
                                companionTexture: undefined,
                                messages: [],
                                anonymous: true,
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
                                } catch (err) {
                                    if (isAxiosError(err)) {
                                        const errorType = ErrorApiData.safeParse(err?.response?.data);
                                        if (errorType.success) {
                                            Sentry.captureException(
                                                `Axios error on room connection ${err?.response?.status} ${errorType.data}`
                                            );
                                            console.error(
                                                "Axios error on room connection",
                                                err?.response?.status,
                                                errorType.data
                                            );
                                            socket.emit("error", {
                                                reason: "error",
                                                status: err?.response?.status || 500,
                                                error: errorType.data,
                                            });
                                            socket.disconnect(true);
                                            return;
                                        } else {
                                            Sentry.captureException(`Unknown error on room connection ${err}`);
                                            console.error("Unknown error on room connection", err);
                                            socket.emit("error", {
                                                reason: null,
                                                message: err?.response?.data,
                                                roomId: roomId,
                                            });
                                            socket.disconnect(true);
                                            return;
                                        }
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
                            if (characterTextureIds.length !== characterTextures.length) {
                                socket.emit("error", {
                                    reason: "invalidTexture",
                                    entityType: "character",
                                });
                                socket.disconnect(true);
                                return;
                            }
                            if (companionTextureId && !companionTexture) {
                                socket.emit("error", {
                                    reason: "invalidTexture",
                                    entityType: "companion",
                                });
                                socket.disconnect(true);
                                return;
                            }
                            const socketData: UserSocketData = {
                                // Data passed here is accessible on the "websocket" socket object.
                                rejected: false,
                                disconnecting: false,
                                token: token && typeof token === "string" ? token : "",
                                roomId,
                                userUuid: userData.userUuid,
                                userJid: userData.jabberId,
                                IPAddress: ipAddress,
                                name,
                                companionTexture,
                                availabilityStatus,
                                lastCommandId,
                                characterTextures,
                                tags: memberTags,
                                visitCardUrl: memberVisitCardUrl,
                                userRoomToken: memberUserRoomToken,
                                jabberId: userData.jabberId,
                                jabberPassword: userData.jabberPassword,
                                mucRooms: userData.mucRooms || undefined,
                                activatedInviteUser: userData.activatedInviteUser || undefined,
                                canEdit: userData.canEdit ?? false,
                                applications: userData.applications,
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
                                isLogged,
                                messages: [],
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
                            };

                            // Let's join the room
                            await socketManager.handleJoinRoom(socket, socketData);
                            socketManager.emitXMPPSettings(socket);

                            //get data information and show messages
                            // if (socketData.messages && Array.isArray(socketData.messages)) {
                            //     socketData.messages.forEach((c: unknown) => {
                            //         const messageToSend = z.object({ type: z.string(), message: z.string() }).parse(c);
                            //         const bytes = ServerToClientMessageTsProto.encode({
                            //             message: {
                            //                 $case: "sendUserMessage",
                            //                 sendUserMessage: {
                            //                     type: messageToSend.type,
                            //                     message: messageToSend.message,
                            //                 },
                            //             },
                            //         }).finish();
                            //         if (!socketData.disconnecting) {
                            //             ws.send(bytes, true);
                            //         }
                            //     });
                            // }

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
                } catch (error) {
                    if (error instanceof Error) {
                        if (!(error instanceof JsonWebTokenError)) {
                            Sentry.captureException(error);
                            console.error(error);
                        }
                        socket.emit("error", {
                            reason: error instanceof JsonWebTokenError ? tokenInvalidException : null,
                            message: error.message,
                            roomId,
                        });
                    } else {
                        socket.emit("error", {
                            reason: null,
                            message: "500 Internal Server Error",
                            roomId,
                        });
                    }
                    socket.disconnect(true);
                    return;
                }
            })().catch((e) => {
                socket.disconnect(true);
                Sentry.captureException(e);
                console.error(e);
            });

            socket.on("disconnect", (reason) => {
                console.info(`Socket disconnect to client on ${socket.handshake.address} for reason ${reason}`);
                try {
                    socketManager.leaveRoom(socket);
                    socketManager.leaveSpaces(socket);
                } catch (e) {
                    Sentry.captureException(`An error occurred on "disconnect" ${e}`);
                    console.error(e);
                }
                // } finally {
                //     if (client.pingIntervalId) {
                //         clearInterval(client.pingIntervalId);
                //     }
                //     if (client.pongTimeoutId) {
                //         clearTimeout(client.pongTimeoutId);
                //     }
                // }
            });

        });


        this.app.ws<SocketData>("/room", {
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
                            characterTextureIds: z.union([z.string(), z.string().array()]),
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
                    const IPAddress = req.getHeader("x-forwarded-for");
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
                                    status: 419,
                                    error: {
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
                                } satisfies FailedErrorData,
                                websocketKey,
                                websocketProtocol,
                                websocketExtensions,
                                context
                            );
                        }
                        const characterTextureIds: string[] =
                            typeof query.characterTextureIds === "string"
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
                            email: userIdentifier,
                            userUuid: userIdentifier,
                            tags: [],
                            visitCardUrl: null,
                            characterTextures: [],
                            companionTexture: undefined,
                            messages: [],
                            anonymous: true,
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
                                    IPAddress,
                                    characterTextureIds,
                                    companionTextureId,
                                    locale
                                );
                            } catch (err) {
                                if (isAxiosError(err)) {
                                    const errorType = ErrorApiData.safeParse(err?.response?.data);
                                    if (errorType.success) {
                                        if (upgradeAborted.aborted) {
                                            // If the response points to nowhere, don't attempt an upgrade
                                            return;
                                        }
                                        Sentry.captureException(
                                            `Axios error on room connection ${err?.response?.status} ${errorType.data}`
                                        );
                                        console.error(
                                            "Axios error on room connection",
                                            err?.response?.status,
                                            errorType.data
                                        );
                                        return res.upgrade(
                                            {
                                                rejected: true,
                                                reason: "error",
                                                status: err?.response?.status || 500,
                                                error: errorType.data,
                                            } satisfies FailedErrorData,
                                            websocketKey,
                                            websocketProtocol,
                                            websocketExtensions,
                                            context
                                        );
                                    } else {
                                        Sentry.captureException(`Unknown error on room connection ${err}`);
                                        console.error("Unknown error on room connection", err);
                                        if (upgradeAborted.aborted) {
                                            // If the response points to nowhere, don't attempt an upgrade
                                            return;
                                        }
                                        return res.upgrade(
                                            {
                                                rejected: true,
                                                reason: null,
                                                status: 500,
                                                message: err?.response?.data,
                                                roomId: roomId,
                                            } satisfies FailedInvalidData,
                                            websocketKey,
                                            websocketProtocol,
                                            websocketExtensions,
                                            context
                                        );
                                    }
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
                        if (characterTextureIds.length !== characterTextures.length) {
                            return res.upgrade(
                                {
                                    rejected: true,
                                    reason: "invalidTexture",
                                    entityType: "character",
                                } satisfies FailedInvalidTextureData,
                                websocketKey,
                                websocketProtocol,
                                websocketExtensions,
                                context
                            );
                        }
                        if (companionTextureId && !companionTexture) {
                            return res.upgrade(
                                {
                                    rejected: true,
                                    reason: "invalidTexture",
                                    entityType: "companion",
                                } satisfies FailedInvalidTextureData,
                                websocketKey,
                                websocketProtocol,
                                websocketExtensions,
                                context
                            );
                        }
                        const responseData: UserSocketData = {
                            // Data passed here is accessible on the "websocket" socket object.
                            rejected: false,
                            disconnecting: false,
                            token: token && typeof token === "string" ? token : "",
                            roomId,
                            userUuid: userData.userUuid,
                            userJid: userData.jabberId,
                            IPAddress,
                            name,
                            companionTexture,
                            availabilityStatus,
                            lastCommandId,
                            characterTextures,
                            tags: memberTags,
                            visitCardUrl: memberVisitCardUrl,
                            userRoomToken: memberUserRoomToken,
                            jabberId: userData.jabberId,
                            jabberPassword: userData.jabberPassword,
                            mucRooms: userData.mucRooms || undefined,
                            activatedInviteUser: userData.activatedInviteUser || undefined,
                            canEdit: userData.canEdit ?? false,
                            applications: userData.applications,
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
                            isLogged,
                            messages: [],
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
                        };
                        /* This immediately calls open handler, you must not use res after this call */
                        res.upgrade(
                            responseData,
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
                                    status: 401,
                                    message: e.message,
                                    roomId,
                                } satisfies FailedInvalidData,
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
                                    status: 500,
                                    roomId,
                                } satisfies FailedInvalidData,
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
                    const clientData = ws.getUserData();
                    if (clientData.rejected === true) {
                        // If there is a room in the error, let's check if we need to clean it.
                        if ('roomId' in clientData) {
                            socketManager.deleteRoomIfEmptyFromId(clientData.roomId);
                        }
                        if (clientData.reason === tokenInvalidException) {
                            socketManager.emitTokenExpiredMessage(ws);
                        } else if (clientData.reason === "error") {
                            socketManager.emitErrorScreenMessage(ws, clientData.error);
                        } else if (clientData.reason === "invalidTexture") {
                            if (clientData.entityType === "character") {
                                socketManager.emitInvalidCharacterTextureMessage(ws);
                            } else {
                                socketManager.emitInvalidCompanionTextureMessage(ws);
                            }
                        } else {
                            socketManager.emitConnectionErrorMessage(ws, clientData.message);
                        }
                        ws.end(1000, "Error message sent");
                        return;
                    }
                    // Let's join the room
                    await socketManager.handleJoinRoom(ws);
                    socketManager.emitXMPPSettings(ws);
                    //get data information and show messages
                    if (clientData.messages && Array.isArray(clientData.messages)) {
                        clientData.messages.forEach((c: unknown) => {
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
                            if (!clientData.disconnecting) {
                                ws.send(bytes, true);
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
                    const message = ClientToServerMessage.decode(new Uint8Array(arrayBuffer));
                    if (!message.message) {
                        console.warn("Empty message received.");
                        return;
                    }
                    switch (message.message.$case) {
                        case "viewportMessage": {
                            socketManager.handleViewport(ws, message.message.viewportMessage);
                            break;
                        }
                        case "userMovesMessage": {
                            socketManager.handleUserMovesMessage(ws, message.message.userMovesMessage);
                            break;
                        }
                        case "playGlobalMessage": {
                            await socketManager.emitPlayGlobalMessage(ws, message.message.playGlobalMessage);
                            break;
                        }
                        case "reportPlayerMessage": {
                            await socketManager.handleReportMessage(ws, message.message.reportPlayerMessage);
                            break;
                        }
                        case "addSpaceFilterMessage": {
                            socketManager.handleAddSpaceFilterMessage(ws, message.message.addSpaceFilterMessage);
                            break;
                        }
                        case "updateSpaceFilterMessage": {
                            socketManager.handleUpdateSpaceFilterMessage(
                                ws,
                                message.message.updateSpaceFilterMessage
                            );
                            break;
                        }
                        case "removeSpaceFilterMessage": {
                            socketManager.handleRemoveSpaceFilterMessage(
                                ws,
                                message.message.removeSpaceFilterMessage
                            );
                            break;
                        }
                        case "setPlayerDetailsMessage": {
                            socketManager.handleSetPlayerDetails(ws, message.message.setPlayerDetailsMessage);
                            break;
                        }
                        case "watchSpaceMessage": {
                            void socketManager.handleJoinSpace(
                                ws,
                                message.message.watchSpaceMessage.spaceName,
                                message.message.watchSpaceMessage.spaceFilter
                            );
                            break;
                        }
                        case "unwatchSpaceMessage": {
                            void socketManager.handleLeaveSpace(ws, message.message.unwatchSpaceMessage.spaceName);
                            break;
                        }
                        case "cameraStateMessage": {
                            socketManager.handleCameraState(ws, message.message.cameraStateMessage.value);
                            break;
                        }
                        case "microphoneStateMessage": {
                            socketManager.handleMicrophoneState(ws, message.message.microphoneStateMessage.value);
                            break;
                        }
                        case "screenSharingStateMessage": {
                            socketManager.handleScreenSharingState(
                                ws,
                                message.message.screenSharingStateMessage.value
                            );
                            break;
                        }
                        case "megaphoneStateMessage": {
                            socketManager.handleMegaphoneState(ws, message.message.megaphoneStateMessage);
                            break;
                        }
                        case "jitsiParticipantIdSpaceMessage": {
                            socketManager.handleJitsiParticipantIdSpace(
                                ws,
                                message.message.jitsiParticipantIdSpaceMessage.spaceName,
                                message.message.jitsiParticipantIdSpaceMessage.value
                            );
                            break;
                        }
                        case "queryMessage": {
                            switch (message.message.queryMessage.query?.$case) {
                                case "roomTagsQuery": {
                                    void socketManager.handleRoomTagsQuery(ws, message.message.queryMessage);
                                    break;
                                }
                                case "embeddableWebsiteQuery": {
                                    void socketManager.handleEmbeddableWebsiteQuery(
                                        ws,
                                        message.message.queryMessage
                                    );
                                    break;
                                }
                                case "roomsFromSameWorldQuery": {
                                    void socketManager.handleRoomsFromSameWorldQuery(
                                        ws,
                                        message.message.queryMessage
                                    );
                                    break;
                                }
                                default: {
                                    socketManager.forwardMessageToBack(ws, message.message);
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
                            socketManager.forwardMessageToBack(ws, message.message);
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
                const client = ws as ExSocketInterface;
                try {
                    client.disconnecting = true;
                    socketManager.leaveRoom(client);
                    socketManager.leaveSpaces(client);
                } catch (e) {
                    Sentry.captureException(`An error occurred on "disconnect" ${e}`);
                    console.error(e);
                } finally {
                    if (client.pingIntervalId) {
                        clearInterval(client.pingIntervalId);
                    }
                    if (client.pongTimeoutId) {
                        clearTimeout(client.pongTimeoutId);
                    }
                }
            },
        });
    }

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    private initClient(ws: any): ExSocketInterface {
        const client: ExSocketInterface = ws;
        client.userJid = ws.userJid;
        client.userUuid = ws.userUuid;
        client.IPAddress = ws.IPAddress;
        client.token = ws.token;
        client.batchedMessages = {
            event: "",
            payload: [],
        };
        client.batchTimeout = null;
        client.emitInBatch = (payload: SubMessage): void => {
            emitInBatch(client, payload);
        };
        client.disconnecting = false;

        client.messages = ws.messages;
        client.name = ws.name;
        client.userIdentifier = ws.userIdentifier;
        client.tags = ws.tags;
        client.visitCardUrl = ws.visitCardUrl;
        client.characterTextures = ws.characterTextures;
        client.companionTexture = ws.companionTexture;
        client.availabilityStatus = ws.availabilityStatus;
        client.lastCommandId = ws.lastCommandId;
        client.roomId = ws.roomId;
        client.listenedZones = new Set<Zone>();
        client.jabberId = ws.jabberId;
        client.jabberPassword = ws.jabberPassword;
        client.mucRooms = ws.mucRooms;
        client.activatedInviteUser = ws.activatedInviteUser;
        client.canEdit = ws.canEdit;
        client.isLogged = ws.isLogged;
        client.applications = ws.applications;
        client.customJsonReplacer = (key: unknown, value: unknown): string | undefined => {
            if (key === "listenedZones") {
                return (value as Set<Zone>).size + " listened zone(s)";
            }
            return undefined;
        };
        client.spaces = [];
        client.spacesFilters = new Map<string, SpaceFilterMessage[]>();
        client.cameraState = ws.cameraState;
        client.microphoneState = ws.microphoneState;
        client.screenSharingState = ws.screenSharingState;
        return client;
    }
}
