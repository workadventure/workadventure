import { ExSocketInterface } from "../Model/Websocket/ExSocketInterface";
import { PointInterface } from "../Model/Websocket/PointInterface";
import {
    SetPlayerDetailsMessage,
    SubMessage,
    BatchMessage,
    ItemEventMessage,
    ViewportMessage,
    ClientToServerMessage,
    WebRtcSignalToServerMessage,
    PlayGlobalMessage,
    ReportPlayerMessage,
    SendUserMessage,
    ServerToClientMessage,
    CompanionMessage,
    EmotePromptMessage,
    FollowRequestMessage,
    FollowConfirmationMessage,
    FollowAbortMessage,
    VariableMessage,
    LockGroupPromptMessage,
    AskPositionMessage,
    AvailabilityStatus,
    QueryMessage,
    PingMessage,
    EditMapCommandMessage,
} from "../Messages/generated/messages_pb";
import { UserMovesMessage } from "../Messages/generated/messages_pb";
import { parse } from "query-string";
import { AdminSocketTokenData, jwtTokenManager, tokenInvalidException } from "../Services/JWTTokenManager";
import { FetchMemberDataByUuidResponse } from "../Services/AdminApi";
import { socketManager } from "../Services/SocketManager";
import { emitInBatch } from "../Services/IoSocketHelpers";
import {
    ADMIN_SOCKETS_TOKEN,
    DISABLE_ANONYMOUS,
    EJABBERD_DOMAIN,
    EJABBERD_JWT_SECRET,
    SOCKET_IDLE_TIMER,
} from "../Enum/EnvironmentVariable";
import { Zone } from "../Model/Zone";
import { ExAdminSocketInterface } from "../Model/Websocket/ExAdminSocketInterface";
import { AdminMessageInterface, isAdminMessageInterface } from "../Model/Websocket/Admin/AdminMessages";
import Axios from "axios";
import { InvalidTokenError } from "../Controller/InvalidTokenError";
import HyperExpress from "hyper-express";
import { WebSocket } from "uWebSockets.js";
import { WokaDetail } from "../Messages/JsonMessages/PlayerTextures";
import { z } from "zod";
import { adminService } from "../Services/AdminService";
import { ErrorApiData, isErrorApiData } from "../Messages/JsonMessages/ErrorApiData";
import { apiVersionHash } from "../Messages/JsonMessages/ApiVersion";

/**
 * The object passed between the "open" and the "upgrade" methods when opening a websocket
 */
interface UpgradeData {
    // Data passed here is accessible on the "websocket" socket object.
    rejected: false;
    token: string;
    userUuid: string;
    IPAddress: string;
    roomId: string;
    name: string;
    companion: CompanionMessage | undefined;
    availabilityStatus: AvailabilityStatus;
    characterLayers: WokaDetail[];
    messages: unknown[];
    tags: string[];
    visitCardUrl: string | null;
    userRoomToken: string | undefined;
    position: PointInterface;
    viewport: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    mucRooms: Array<MucRoomDefinitionInterface> | undefined;
    activatedInviteUser: boolean | undefined;
    isLogged: boolean;
}

interface UpgradeFailedInvalidData {
    rejected: true;
    reason: "tokenInvalid" | "textureInvalid" | "invalidVersion" | null;
    message: string;
    roomId: string;
}
import Jwt from "jsonwebtoken";
import { MucRoomDefinitionInterface } from "../Messages/JsonMessages/MucRoomDefinitionInterface";
//eslint-disable-next-line @typescript-eslint/no-var-requires
const { jid } = require("@xmpp/client");

interface UpgradeFailedErrorData {
    rejected: true;
    reason: "error";
    error: ErrorApiData;
}

type UpgradeFailedData = UpgradeFailedErrorData | UpgradeFailedInvalidData;

// Maximum time to wait for a pong answer to a ping before closing connection.
// Note: PONG_TIMEOUT must be less than PING_INTERVAL
const PONG_TIMEOUT = 10000;
const PING_INTERVAL = 15000;

export class IoSocketController {
    private nextUserId = 1;

    constructor(private readonly app: HyperExpress.compressors.TemplatedApp) {
        this.ioConnection();
        if (ADMIN_SOCKETS_TOKEN) {
            this.adminRoomSocket();
        }
    }

    adminRoomSocket(): void {
        this.app.ws("/admin/rooms", {
            upgrade: (res, req, context) => {
                const websocketKey = req.getHeader("sec-websocket-key");
                const websocketProtocol = req.getHeader("sec-websocket-protocol");
                const websocketExtensions = req.getHeader("sec-websocket-extensions");

                res.upgrade({}, websocketKey, websocketProtocol, websocketExtensions, context);
            },
            open: (ws) => {
                console.log("Admin socket connect to client on " + Buffer.from(ws.getRemoteAddressAsText()).toString());
                ws.disconnecting = false;
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
                        }
                        console.error("Invalid message received.", message);
                        ws.send(
                            JSON.stringify({
                                type: "Error",
                                data: {
                                    message: "Invalid message received! The connection has been closed.",
                                },
                            })
                        );
                        ws.close();
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
                        ws.close();
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
                            console.error();
                            ws.send(
                                JSON.stringify({
                                    type: "Error",
                                    data: {
                                        message: errorMessage,
                                    },
                                })
                            );
                            ws.close();
                            return;
                        }

                        for (const roomId of message.roomIds) {
                            socketManager
                                .handleAdminRoom(ws as ExAdminSocketInterface, roomId)
                                .catch((e) => console.error(e));
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
                                    .catch((error) => console.error(error));
                            } else if (messageToEmit.type === "ban") {
                                socketManager
                                    .emitSendUserMessage(
                                        messageToEmit.userUuid,
                                        messageToEmit.message,
                                        messageToEmit.type,
                                        roomId
                                    )
                                    .catch((error) => console.error(error));
                            }
                        }
                    }
                } catch (err) {
                    console.error(err);
                }
            },
            close: (ws) => {
                const Client = ws as ExAdminSocketInterface;
                try {
                    Client.disconnecting = true;
                    socketManager.leaveAdminRoom(Client);
                } catch (e) {
                    console.error('An error occurred on admin "disconnect"');
                    console.error(e);
                }
            },
        });
    }

    ioConnection(): void {
        this.app.ws("/room", {
            /* Options */
            //compression: uWS.SHARED_COMPRESSOR,
            idleTimeout: SOCKET_IDLE_TIMER,
            maxPayloadLength: 16 * 1024 * 1024,
            maxBackpressure: 65536, // Maximum 64kB of data in the buffer.
            upgrade: (res, req, context) => {
                (async (): Promise<void> => {
                    /* Keep track of abortions */
                    const upgradeAborted = { aborted: false };

                    res.onAborted(() => {
                        /* We can simply signal that we were aborted */
                        upgradeAborted.aborted = true;
                    });

                    const query = parse(req.getQuery());
                    const websocketKey = req.getHeader("sec-websocket-key");
                    const websocketProtocol = req.getHeader("sec-websocket-protocol");
                    const websocketExtensions = req.getHeader("sec-websocket-extensions");
                    const IPAddress = req.getHeader("x-forwarded-for");
                    const locale = req.getHeader("accept-language");

                    const roomId = query.roomId;
                    try {
                        if (typeof roomId !== "string") {
                            throw new Error("Undefined room ID: ");
                        }

                        const token = query.token;
                        const x = Number(query.x);
                        const y = Number(query.y);
                        const top = Number(query.top);
                        const bottom = Number(query.bottom);
                        const left = Number(query.left);
                        const right = Number(query.right);
                        const name = query.name;
                        const availabilityStatus = Number(query.availabilityStatus);
                        const version = query.version;

                        if (version !== apiVersionHash) {
                            return res.upgrade(
                                {
                                    rejected: true,
                                    reason: "error",
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
                                } as UpgradeFailedData,
                                websocketKey,
                                websocketProtocol,
                                websocketExtensions,
                                context
                            );
                        }

                        let companion: CompanionMessage | undefined = undefined;

                        if (typeof query.companion === "string") {
                            companion = new CompanionMessage();
                            companion.setName(query.companion);
                        }

                        if (typeof name !== "string") {
                            throw new Error("Expecting name");
                        }
                        if (typeof availabilityStatus !== "number") {
                            throw new Error("Expecting availability status");
                        }
                        if (name === "") {
                            throw new Error("No empty name");
                        }
                        let characterLayers = query.characterLayers;
                        if (characterLayers === null) {
                            throw new Error("Expecting skin");
                        }
                        if (typeof characterLayers === "string") {
                            characterLayers = [characterLayers];
                        }

                        const tokenData =
                            token && typeof token === "string" ? jwtTokenManager.verifyJWTToken(token) : null;

                        if (DISABLE_ANONYMOUS && !tokenData) {
                            throw new Error("Expecting token");
                        }

                        const userIdentifier = tokenData ? tokenData.identifier : "";
                        const isLogged = tokenData?.accessToken ? true : false;

                        let memberTags: string[] = [];
                        let memberVisitCardUrl: string | null = null;
                        let memberMessages: unknown;
                        let memberUserRoomToken: string | undefined;
                        let memberTextures: WokaDetail[] = [];
                        let userData: FetchMemberDataByUuidResponse = {
                            email: userIdentifier,
                            userUuid: userIdentifier,
                            tags: [],
                            visitCardUrl: null,
                            textures: [],
                            messages: [],
                            anonymous: true,
                            userRoomToken: undefined,
                            jabberId: null,
                            jabberPassword: null,
                            mucRooms: [],
                            activatedInviteUser: true,
                        };

                        let characterLayerObjs: WokaDetail[];

                        try {
                            try {
                                userData = await adminService.fetchMemberDataByUuid(
                                    userIdentifier,
                                    isLogged,
                                    roomId,
                                    IPAddress,
                                    characterLayers,
                                    locale
                                );
                            } catch (err) {
                                if (Axios.isAxiosError(err)) {
                                    const errorType = isErrorApiData.safeParse(err?.response?.data);
                                    if (errorType.success) {
                                        return res.upgrade(
                                            {
                                                rejected: true,
                                                reason: "error",
                                                status: err?.response?.status,
                                                error: errorType.data,
                                            } as UpgradeFailedData,
                                            websocketKey,
                                            websocketProtocol,
                                            websocketExtensions,
                                            context
                                        );
                                    } else {
                                        return res.upgrade(
                                            {
                                                rejected: true,
                                                reason: null,
                                                status: 500,
                                                message: err?.response?.data,
                                                roomId: roomId,
                                            } as UpgradeFailedData,
                                            websocketKey,
                                            websocketProtocol,
                                            websocketExtensions,
                                            context
                                        );
                                    }
                                }
                                throw err;
                            }
                            memberMessages = userData.messages;
                            memberTags = userData.tags;
                            memberVisitCardUrl = userData.visitCardUrl;
                            memberTextures = userData.textures;
                            memberUserRoomToken = userData.userRoomToken;
                            characterLayerObjs = memberTextures;
                        } catch (e) {
                            console.log(
                                "access not granted for user " + (userIdentifier || "anonymous") + " and room " + roomId
                            );
                            console.error(e);
                            throw new Error("User cannot access this world");
                        }

                        if (!userData.jabberId) {
                            // If there is no admin, or no user, let's log users using JWT tokens
                            userData.jabberId = jid(userIdentifier, EJABBERD_DOMAIN).toString();
                            if (EJABBERD_JWT_SECRET) {
                                userData.jabberPassword = Jwt.sign({ jid: userData.jabberId }, EJABBERD_JWT_SECRET, {
                                    expiresIn: "1d",
                                    algorithm: "HS256",
                                });
                            } else {
                                userData.jabberPassword = "no_password_set";
                            }
                        }

                        // Generate characterLayers objects from characterLayers string[]
                        /*const characterLayerObjs: CharacterLayer[] =
                            SocketManager.mergeCharacterLayersAndCustomTextures(characterLayers, memberTextures);*/

                        if (upgradeAborted.aborted) {
                            console.log("Ouch! Client disconnected before we could upgrade it!");
                            /* You must not upgrade now */
                            return;
                        }

                        /* This immediately calls open handler, you must not use res after this call */
                        res.upgrade(
                            {
                                // Data passed here is accessible on the "websocket" socket object.
                                rejected: false,
                                token,
                                userUuid: userData.userUuid,
                                IPAddress,
                                userIdentifier,
                                roomId,
                                name,
                                companion,
                                availabilityStatus,
                                characterLayers: characterLayerObjs,
                                messages: memberMessages,
                                tags: memberTags,
                                visitCardUrl: memberVisitCardUrl,
                                userRoomToken: memberUserRoomToken,
                                textures: memberTextures,
                                jabberId: userData.jabberId,
                                jabberPassword: userData.jabberPassword,
                                mucRooms: userData.mucRooms,
                                activatedInviteUser: userData.activatedInviteUser,
                                position: {
                                    x: x,
                                    y: y,
                                    direction: "down",
                                    moving: false,
                                } as PointInterface,
                                viewport: {
                                    top,
                                    right,
                                    bottom,
                                    left,
                                },
                                isLogged,
                            } as UpgradeData,
                            /* Spell these correctly */
                            websocketKey,
                            websocketProtocol,
                            websocketExtensions,
                            context
                        );
                    } catch (e) {
                        if (e instanceof Error) {
                            if (!(e instanceof InvalidTokenError)) {
                                console.error(e);
                            }
                            res.upgrade(
                                {
                                    rejected: true,
                                    reason: e instanceof InvalidTokenError ? tokenInvalidException : null,
                                    message: e.message,
                                    roomId,
                                } as UpgradeFailedData,
                                websocketKey,
                                websocketProtocol,
                                websocketExtensions,
                                context
                            );
                        } else {
                            res.upgrade(
                                {
                                    rejected: true,
                                    reason: null,
                                    message: "500 Internal Server Error",
                                    roomId,
                                } as UpgradeFailedData,
                                websocketKey,
                                websocketProtocol,
                                websocketExtensions,
                                context
                            );
                        }
                    }
                })();
            },
            /* Handlers */
            open: (_ws: WebSocket) => {
                const ws = _ws as WebSocket & (UpgradeData | UpgradeFailedData);
                if (ws.rejected === true) {
                    // If there is a room in the error, let's check if we need to clean it.
                    if (ws.roomId) {
                        socketManager.deleteRoomIfEmptyFromId(ws.roomId);
                    }

                    //FIX ME to use status code
                    if (ws.reason === tokenInvalidException) {
                        socketManager.emitTokenExpiredMessage(ws);
                    } else if (ws.reason === "textureInvalid") {
                        socketManager.emitInvalidTextureMessage(ws);
                    } else if (ws.reason === "error") {
                        socketManager.emitErrorScreenMessage(ws, ws.error);
                    } else {
                        socketManager.emitConnexionErrorMessage(ws, ws.message);
                    }
                    setTimeout(() => ws.close(), 0);
                    return;
                }

                // Let's join the room
                const client = this.initClient(ws);
                socketManager.handleJoinRoom(client);

                //get data information and show messages
                if (client.messages && Array.isArray(client.messages)) {
                    client.messages.forEach((c: unknown) => {
                        const messageToSend = c as { type: string; message: string };

                        const sendUserMessage = new SendUserMessage();
                        sendUserMessage.setType(messageToSend.type);
                        sendUserMessage.setMessage(messageToSend.message);

                        const serverToClientMessage = new ServerToClientMessage();
                        serverToClientMessage.setSendusermessage(sendUserMessage);

                        if (!client.disconnecting) {
                            client.send(serverToClientMessage.serializeBinary().buffer, true);
                        }
                    });
                }

                const pingMessage = new PingMessage();
                const pingSubMessage = new SubMessage();
                pingSubMessage.setPingmessage(pingMessage);

                client.pingIntervalId = setInterval(() => {
                    client.emitInBatch(pingSubMessage);

                    if (client.pongTimeoutId) {
                        console.warn("Warning, emitting a new ping message before previous pong message was received.");
                        client.resetPongTimeout();
                    }

                    client.pongTimeoutId = setTimeout(() => {
                        console.log("Connexion lost with user ", client.userUuid);
                        client.close();
                    }, PONG_TIMEOUT);
                }, PING_INTERVAL);

                client.resetPongTimeout();
            },
            message: (ws, arrayBuffer): void => {
                const client = ws as ExSocketInterface;
                const message = ClientToServerMessage.deserializeBinary(new Uint8Array(arrayBuffer));

                if (message.hasViewportmessage()) {
                    socketManager.handleViewport(client, (message.getViewportmessage() as ViewportMessage).toObject());
                } else if (message.hasUsermovesmessage()) {
                    socketManager.handleUserMovesMessage(client, message.getUsermovesmessage() as UserMovesMessage);
                } else if (message.hasSetplayerdetailsmessage()) {
                    socketManager.handleSetPlayerDetails(
                        client,
                        message.getSetplayerdetailsmessage() as SetPlayerDetailsMessage
                    );
                } else if (message.hasItemeventmessage()) {
                    socketManager.handleItemEvent(client, message.getItemeventmessage() as ItemEventMessage);
                } else if (message.hasVariablemessage()) {
                    socketManager.handleVariableEvent(client, message.getVariablemessage() as VariableMessage);
                } else if (message.hasWebrtcsignaltoservermessage()) {
                    socketManager.emitVideo(
                        client,
                        message.getWebrtcsignaltoservermessage() as WebRtcSignalToServerMessage
                    );
                } else if (message.hasWebrtcscreensharingsignaltoservermessage()) {
                    socketManager.emitScreenSharing(
                        client,
                        message.getWebrtcscreensharingsignaltoservermessage() as WebRtcSignalToServerMessage
                    );
                } else if (message.hasPlayglobalmessage()) {
                    socketManager.emitPlayGlobalMessage(client, message.getPlayglobalmessage() as PlayGlobalMessage);
                } else if (message.hasReportplayermessage()) {
                    socketManager.handleReportMessage(client, message.getReportplayermessage() as ReportPlayerMessage);
                } else if (message.hasQuerymessage()) {
                    socketManager.handleQueryMessage(client, message.getQuerymessage() as QueryMessage);
                } else if (message.hasEmotepromptmessage()) {
                    socketManager.handleEmotePromptMessage(
                        client,
                        message.getEmotepromptmessage() as EmotePromptMessage
                    );
                } else if (message.hasFollowrequestmessage()) {
                    socketManager.handleFollowRequest(
                        client,
                        message.getFollowrequestmessage() as FollowRequestMessage
                    );
                } else if (message.hasFollowconfirmationmessage()) {
                    socketManager.handleFollowConfirmation(
                        client,
                        message.getFollowconfirmationmessage() as FollowConfirmationMessage
                    );
                } else if (message.hasFollowabortmessage()) {
                    socketManager.handleFollowAbort(client, message.getFollowabortmessage() as FollowAbortMessage);
                } else if (message.hasLockgrouppromptmessage()) {
                    socketManager.handleLockGroup(
                        client,
                        message.getLockgrouppromptmessage() as LockGroupPromptMessage
                    );
                } else if (message.hasPingmessage()) {
                    client.resetPongTimeout();
                } else if (message.hasEditmapcommandmessage()) {
                    socketManager.handleEditMapCommandMessage(
                        client,
                        message.getEditmapcommandmessage() as EditMapCommandMessage
                    );
                } else if (message.hasAskpositionmessage()) {
                    socketManager.handleAskPositionMessage(
                        client,
                        message.getAskpositionmessage() as AskPositionMessage
                    );
                }

                /* Ok is false if backpressure was built up, wait for drain */
                //let ok = ws.send(message, isBinary);
            },
            drain: (ws) => {
                console.log("WebSocket backpressure: " + ws.getBufferedAmount());
            },
            close: (ws) => {
                const Client = ws as ExSocketInterface;
                try {
                    Client.disconnecting = true;
                    //leave room
                    socketManager.leaveRoom(Client);
                } catch (e) {
                    console.error('An error occurred on "disconnect"');
                    console.error(e);
                } finally {
                    if (Client.pingIntervalId) {
                        clearInterval(Client.pingIntervalId);
                    }
                    if (Client.pongTimeoutId) {
                        clearTimeout(Client.pongTimeoutId);
                    }
                }
            },
        });
    }

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    private initClient(ws: any): ExSocketInterface {
        const client: ExSocketInterface = ws;
        client.userId = this.nextUserId;
        this.nextUserId++;
        client.userUuid = ws.userUuid;
        client.IPAddress = ws.IPAddress;
        client.token = ws.token;
        client.batchedMessages = new BatchMessage();
        client.batchTimeout = null;
        client.emitInBatch = (payload: SubMessage): void => {
            emitInBatch(client, payload);
        };
        client.resetPongTimeout = (): void => {
            if (client.pongTimeoutId) {
                clearTimeout(client.pongTimeoutId);
                client.pongTimeoutId = undefined;
            }
        };
        client.disconnecting = false;

        client.messages = ws.messages;
        client.name = ws.name;
        client.userIdentifier = ws.userIdentifier;
        client.tags = ws.tags;
        client.visitCardUrl = ws.visitCardUrl;
        client.characterLayers = ws.characterLayers;
        client.companion = ws.companion;
        client.availabilityStatus = ws.availabilityStatus;
        client.roomId = ws.roomId;
        client.listenedZones = new Set<Zone>();
        client.jabberId = ws.jabberId;
        client.jabberPassword = ws.jabberPassword;
        client.mucRooms = ws.mucRooms;
        client.activatedInviteUser = ws.activatedInviteUser;
        client.isLogged = ws.isLogged;
        return client;
    }
}
