import { ExSocketInterface } from "../Model/Websocket/ExSocketInterface";
import { GameRoomPolicyTypes } from "../Model/PusherRoom";
import { PointInterface } from "../Model/Websocket/PointInterface";
import {
    SetPlayerDetailsMessage,
    SubMessage,
    BatchMessage,
    ItemEventMessage,
    ViewportMessage,
    ClientToServerMessage,
    SilentMessage,
    WebRtcSignalToServerMessage,
    PlayGlobalMessage,
    ReportPlayerMessage,
    QueryJitsiJwtMessage,
    SendUserMessage,
    ServerToClientMessage,
    CompanionMessage,
    EmotePromptMessage,
    FollowRequestMessage,
    FollowConfirmationMessage,
    FollowAbortMessage,
    VariableMessage,
    LockGroupPromptMessage,
} from "../Messages/generated/messages_pb";
import { UserMovesMessage } from "../Messages/generated/messages_pb";
import { parse } from "query-string";
import { AdminSocketTokenData, jwtTokenManager, tokenInvalidException } from "../Services/JWTTokenManager";
import { FetchMemberDataByUuidResponse } from "../Services/AdminApi";
import { socketManager } from "../Services/SocketManager";
import { emitInBatch } from "../Services/IoSocketHelpers";
import { ADMIN_API_URL, ADMIN_SOCKETS_TOKEN, DISABLE_ANONYMOUS, SOCKET_IDLE_TIMER } from "../Enum/EnvironmentVariable";
import { Zone } from "../Model/Zone";
import { ExAdminSocketInterface } from "../Model/Websocket/ExAdminSocketInterface";
import { AdminMessageInterface, isAdminMessageInterface } from "../Model/Websocket/Admin/AdminMessages";
import Axios from "axios";
import { InvalidTokenError } from "../Controller/InvalidTokenError";
import HyperExpress from "hyper-express";
import { localWokaService } from "../Services/LocalWokaService";
import { WebSocket } from "uWebSockets.js";
import { WokaDetail } from "../Messages/JsonMessages/PlayerTextures";
import { z } from "zod";
import { adminService } from "../Services/AdminService";
import { ErrorApiData, isErrorApiData } from "../Messages/JsonMessages/ErrorApiData";

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
}

interface UpgradeFailedInvalidData {
    rejected: true;
    reason: "tokenInvalid" | "textureInvalid" | null;
    message: string;
    roomId: string;
}

interface UpgradeFailedErrorData {
    rejected: true;
    reason: "error";
    error: ErrorApiData;
}

type UpgradeFailedData = UpgradeFailedErrorData | UpgradeFailedInvalidData;

export class IoSocketController {
    private nextUserId: number = 1;

    constructor(private readonly app: HyperExpress.compressors.TemplatedApp) {
        this.ioConnection();
        if (ADMIN_SOCKETS_TOKEN) {
            this.adminRoomSocket();
        }
    }

    adminRoomSocket() {
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

    ioConnection() {
        this.app.ws("/room", {
            /* Options */
            //compression: uWS.SHARED_COMPRESSOR,
            idleTimeout: SOCKET_IDLE_TIMER,
            maxPayloadLength: 16 * 1024 * 1024,
            maxBackpressure: 65536, // Maximum 64kB of data in the buffer.
            //idleTimeout: 10,
            upgrade: (res, req, context) => {
                (async () => {
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

                        let companion: CompanionMessage | undefined = undefined;

                        if (typeof query.companion === "string") {
                            companion = new CompanionMessage();
                            companion.setName(query.companion);
                        }

                        if (typeof name !== "string") {
                            throw new Error("Expecting name");
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

                        let memberTags: string[] = [];
                        let memberVisitCardUrl: string | null = null;
                        let memberMessages: unknown;
                        let memberUserRoomToken: string | undefined;
                        let memberTextures: WokaDetail[] = [];
                        const room = await socketManager.getOrCreateRoom(roomId);
                        let userData: FetchMemberDataByUuidResponse = {
                            email: userIdentifier,
                            userUuid: userIdentifier,
                            tags: [],
                            visitCardUrl: null,
                            textures: [],
                            messages: [],
                            anonymous: true,
                            userRoomToken: undefined,
                        };

                        let characterLayerObjs: WokaDetail[];

                        if (ADMIN_API_URL) {
                            try {
                                try {
                                    userData = await adminService.fetchMemberDataByUuid(
                                        req.getHeader("accept-language"),
                                        userIdentifier,
                                        roomId,
                                        IPAddress,
                                        characterLayers
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
                                        }
                                    }
                                    throw err;
                                }
                                memberMessages = userData.messages;
                                memberTags = userData.tags;
                                memberVisitCardUrl = userData.visitCardUrl;
                                memberTextures = userData.textures;
                                memberUserRoomToken = userData.userRoomToken;

                                if (
                                    room.policyType === GameRoomPolicyTypes.USE_TAGS_POLICY &&
                                    (userData.anonymous === true || !room.canAccess(memberTags))
                                ) {
                                    throw new Error("Insufficient privileges to access this room");
                                }
                                if (
                                    room.policyType === GameRoomPolicyTypes.MEMBERS_ONLY_POLICY &&
                                    userData.anonymous === true
                                ) {
                                    throw new Error("Use the login URL to connect");
                                }

                                characterLayerObjs = memberTextures;
                            } catch (e) {
                                console.log(
                                    "access not granted for user " +
                                        (userIdentifier || "anonymous") +
                                        " and room " +
                                        roomId
                                );
                                console.error(e);
                                throw new Error("User cannot access this world");
                            }
                        } else {
                            const fetchedTextures = await localWokaService.fetchWokaDetails(characterLayers);
                            if (fetchedTextures === undefined) {
                                // The textures we want to use do not exist!
                                // We need to go in error.
                                res.upgrade(
                                    {
                                        rejected: true,
                                        reason: "textureInvalid",
                                        message: "",
                                        roomId,
                                    } as UpgradeFailedData,
                                    websocketKey,
                                    websocketProtocol,
                                    websocketExtensions,
                                    context
                                );
                                return;
                            }
                            characterLayerObjs = fetchedTextures;
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
                                roomId,
                                name,
                                companion,
                                characterLayers: characterLayerObjs,
                                messages: memberMessages,
                                tags: memberTags,
                                visitCardUrl: memberVisitCardUrl,
                                userRoomToken: memberUserRoomToken,
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
                            } as UpgradeData,
                            /* Spell these correctly */
                            websocketKey,
                            websocketProtocol,
                            websocketExtensions,
                            context
                        );
                    } catch (e) {
                        if (e instanceof Error) {
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
                } else if (message.hasSilentmessage()) {
                    socketManager.handleSilentMessage(client, message.getSilentmessage() as SilentMessage);
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
                } else if (message.hasQueryjitsijwtmessage()) {
                    socketManager.handleQueryJitsiJwtMessage(
                        client,
                        message.getQueryjitsijwtmessage() as QueryJitsiJwtMessage
                    );
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
        client.disconnecting = false;

        client.messages = ws.messages;
        client.name = ws.name;
        client.tags = ws.tags;
        client.visitCardUrl = ws.visitCardUrl;
        client.characterLayers = ws.characterLayers;
        client.companion = ws.companion;
        client.roomId = ws.roomId;
        client.listenedZones = new Set<Zone>();
        return client;
    }
}
