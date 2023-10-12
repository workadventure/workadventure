import { isAxiosError } from "axios";
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
import { jwtTokenManager, tokenInvalidException } from "../services/JWTTokenManager";
import type { FetchMemberDataByUuidResponse } from "../services/AdminApi";
import { socketManager } from "../services/SocketManager";
import { emitInBatch } from "../services/IoSocketHelpers";
import {
    ADMIN_SOCKETS_TOKEN,
    DISABLE_ANONYMOUS,
    EJABBERD_DOMAIN,
    EJABBERD_JWT_SECRET,
} from "../enums/EnvironmentVariable";
import type { Zone } from "../models/Zone";
import { adminService } from "../services/AdminService";
import { Namespace, Server as SocketServer } from "socket.io";
import {
    SocketData
} from "../models/websocket/SocketData";
import AdminRoomAuthenticatedMiddleware from "../models/websocket/middlewares/AdminRoomAuthenticatedMiddleware";
import MessageValidatorMiddleware from "../models/websocket/middlewares/MessageValidatorMiddleware";
import {
    AdminRoomClientToServerEvents,
    AdminRoomClientToServerFunctions,
    AdminRoomInterServerEvents,
    AdminRoomInterServerFunctions,
    AdminRoomServerToClientEvents,
    AdminRoomServerToClientFunctions,
    AdminRoomSocketData,
} from "@workadventure/socket-namespaces/src/admin-room/AdminRoomNamespace";
import { QueryRoomNamespace } from "@workadventure/socket-namespaces/src/room/QueryRoomNamespace";
import {
    RoomClientToServerEvents,
    RoomServerToClientEvents,
    RoomInterServerEvents,
    RoomSocketData,
    RoomClientToServerFunctions,
    RoomServerToClientFunctions,
    RoomInterServerFunctions,
} from "@workadventure/socket-namespaces/src/room/RoomNamespace";

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
            AdminRoomClientToServerFunctions,
            AdminRoomServerToClientFunctions,
            AdminRoomInterServerFunctions,
            AdminRoomSocketData
        > = this.app
            .of("/admin/rooms")
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
            RoomClientToServerFunctions,
            RoomServerToClientFunctions,
            RoomInterServerFunctions,
            RoomSocketData
        > = this.app.of("/room");

        roomNamespace.on("connection", (socket) => {
            console.info(`Socket connect to client on ${socket.handshake.address}`);

            (async () => {
                let queryData: QueryRoomNamespace;

                try {
                    queryData = QueryRoomNamespace.parse(socket.handshake.query);
                } catch (error) {
                    let messages =
                        error instanceof z.ZodError
                            ? error.issues.map((issue) => "Parameter " + issue.path + ": " + issue.message)
                            : ["Unknown error"];

                    socketManager.emitErrorScreenMessage(socket, {
                        type: "error",
                        title: "400 Bad Request",
                        subtitle: "Something wrong while connection!",
                        image: "",
                        code: "WS_BAD_REQUEST",
                        details: messages.join("\n"),
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
                        socketManager.emitErrorScreenMessage(socket, {
                            type: "retry",
                            title: "Please refresh",
                            subtitle: "New version available",
                            image: "/resources/icons/new_version.png",
                            code: "NEW_VERSION",
                            details: "A new version of WorkAdventure is available. Please refresh your window",
                            canRetryManual: true,
                            buttonTitle: "Refresh",
                            timeToRetry: 999999,
                        });
                        socket.disconnect(true);
                        return;
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
                                    socketManager.emitErrorScreenMessage(socket, errorType.data);
                                    socket.disconnect(true);
                                    return;
                                } else {
                                    Sentry.captureException(`Unknown error on room connection ${err}`);
                                    console.error("Unknown error on room connection", err);
                                    socketManager.emitErrorScreenMessage(socket, err?.response?.data);
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
                        socketManager.emitInvalidCharacterTextureMessage(socket);
                        socket.disconnect(true);
                        return;
                    }
                    if (companionTextureId && !companionTexture) {
                        socketManager.emitInvalidCompanionTextureMessage(socket);
                        socket.disconnect(true);
                        return;
                    }
                    const socketData: SocketData = {
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
                        emitInBatch: (payload: SubMessage): void => {
                            emitInBatch(socket, payload);
                        },
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
                    //         if (!socket.disconnected) {
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
                        error instanceof JsonWebTokenError ?
                            socketManager.emitTokenExpiredMessage(socket) :
                            socketManager.emitConnectionErrorMessage(socket, error.message);

                    } else {
                        socketManager.emitConnectionErrorMessage(socket, "500 Internal Server Error");
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
                    socketManager.leaveSpaces(socket);
                    socketManager.leaveRoom(socket);
                } catch (e) {
                    Sentry.captureException(`An error occurred on "disconnect" ${e}`);
                    console.error(e);
                }
            });

            socket.on("message", async (data) => {
                try {
                    const message = ClientToServerMessage.decode(data.buffer);
                    if (!message.message) {
                        console.warn("Empty message received.");
                        return;
                    }

                    console.log("message received", message)
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
                            socketManager.handleUpdateSpaceFilterMessage(socket, message.message.updateSpaceFilterMessage);
                            break;
                        }
                        case "removeSpaceFilterMessage": {
                            socketManager.handleRemoveSpaceFilterMessage(socket, message.message.removeSpaceFilterMessage);
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
                            socketManager.handleScreenSharingState(socket, message.message.screenSharingStateMessage.value);
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
                                    void socketManager.handleEmbeddableWebsiteQuery(socket, message.message.queryMessage);
                                    break;
                                }
                                case "roomsFromSameWorldQuery": {
                                    void socketManager.handleRoomsFromSameWorldQuery(socket, message.message.queryMessage);
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
                        default: {
                            const _exhaustiveCheck: never = message.message;
                        }
                    }
                } catch (e) {
                    Sentry.captureException(e);
                    console.error(e);
                }
            });
        });
    }
}
