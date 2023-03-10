import type { ExSocketInterface } from "../models/Websocket/ExSocketInterface";
import { PointInterface } from "../models/Websocket/PointInterface";
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
import type { ExAdminSocketInterface } from "../models/Websocket/ExAdminSocketInterface";
import type { AdminMessageInterface } from "../models/Websocket/Admin/AdminMessages";
import { isAdminMessageInterface } from "../models/Websocket/Admin/AdminMessages";
import Axios from "axios";
import { InvalidTokenError } from "./InvalidTokenError";
import type HyperExpress from "hyper-express";
import { z } from "zod";
import { adminService } from "../services/AdminService";
import {
    apiVersionHash,
    AvailabilityStatus,
    ClientToServerMessage,
    CompanionMessage,
    ErrorApiData,
    MucRoomDefinition,
    ServerToClientMessage as ServerToClientMessageTsProto,
    SubMessage,
    WokaDetail,
    ApplicationDefinitionInterface,
} from "@workadventure/messages";
import Jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { JID } from "stanza";
import { validateWebsocketQuery } from "../services/QueryValidator";

type WebSocket = HyperExpress.compressors.WebSocket;

/**
 * The object passed between the "open" and the "upgrade" methods when opening a websocket
 */
type UpgradeData = {
    // Data passed here is accessible on the "websocket" socket object.
    rejected: false;
    token: string;
    userUuid: string;
    userJid: string;
    IPAddress: string;
    userIdentifier: string;
    roomId: string;
    name: string;
    companion?: CompanionMessage;
    availabilityStatus: AvailabilityStatus;
    lastCommandId?: string;
    characterLayers: WokaDetail[];
    messages: unknown[];
    tags: string[];
    visitCardUrl: string | null;
    userRoomToken?: string;
    textures: WokaDetail[];
    jabberId?: string;
    jabberPassword?: string | null;
    applications?: ApplicationDefinitionInterface[] | null;
    position: PointInterface;
    viewport: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    mucRooms?: MucRoomDefinition[];
    activatedInviteUser?: boolean;
    isLogged: boolean;
    canEdit: boolean;
};

type UpgradeFailedInvalidData = {
    rejected: true;
    reason: "tokenInvalid" | "textureInvalid" | "invalidVersion" | null;
    message: string;
    status: number;
    roomId: string;
};

type UpgradeFailedErrorData = {
    rejected: true;
    reason: "error";
    status: number;
    error: ErrorApiData;
};

export type UpgradeFailedData = UpgradeFailedErrorData | UpgradeFailedInvalidData;

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
                            console.error(errorMessage);
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
                            characterLayers: z.union([z.string(), z.string().array()]),
                            x: z.coerce.number(),
                            y: z.coerce.number(),
                            top: z.coerce.number(),
                            bottom: z.coerce.number(),
                            left: z.coerce.number(),
                            right: z.coerce.number(),
                            companion: z.string().optional(),
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
                                } satisfies UpgradeFailedData,
                                websocketKey,
                                websocketProtocol,
                                websocketExtensions,
                                context
                            );
                        }

                        const companion: CompanionMessage | undefined = query.companion
                            ? {
                                  name: query.companion,
                              }
                            : undefined;

                        const characterLayers: string[] =
                            typeof query.characterLayers === "string" ? [query.characterLayers] : query.characterLayers;

                        const tokenData = token ? jwtTokenManager.verifyJWTToken(token) : null;

                        if (DISABLE_ANONYMOUS && !tokenData) {
                            throw new Error("Expecting token");
                        }

                        const userIdentifier = tokenData ? tokenData.identifier : "";
                        const isLogged = !!tokenData?.accessToken;

                        let memberTags: string[] = [];
                        let memberVisitCardUrl: string | null = null;
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
                            canEdit: false,
                        };

                        let characterLayerObjs: WokaDetail[];

                        try {
                            try {
                                userData = await adminService.fetchMemberDataByUuid(
                                    userIdentifier,
                                    tokenData?.accessToken,
                                    roomId,
                                    IPAddress,
                                    characterLayers,
                                    locale
                                );
                            } catch (err) {
                                if (Axios.isAxiosError(err)) {
                                    const errorType = ErrorApiData.safeParse(err?.response?.data);
                                    if (errorType.success) {
                                        if (upgradeAborted.aborted) {
                                            // If the response points to nowhere, don't attempt an upgrade
                                            return;
                                        }

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
                                            } satisfies UpgradeFailedData,
                                            websocketKey,
                                            websocketProtocol,
                                            websocketExtensions,
                                            context
                                        );
                                    } else {
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
                                            } satisfies UpgradeFailedData,
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

                        // Generate characterLayers objects from characterLayers string[]
                        /*const characterLayerObjs: CharacterLayer[] =
                                SocketManager.mergeCharacterLayersAndCustomTextures(characterLayers, memberTextures);*/

                        if (upgradeAborted.aborted) {
                            console.log("Ouch! Client disconnected before we could upgrade it!");
                            /* You must not upgrade now */
                            return;
                        }

                        const responseData: UpgradeData = {
                            // Data passed here is accessible on the "websocket" socket object.
                            rejected: false,
                            token: token && typeof token === "string" ? token : "",
                            userUuid: userData.userUuid,
                            userJid: userData.jabberId,
                            IPAddress,
                            userIdentifier,
                            roomId,
                            name,
                            companion,
                            availabilityStatus,
                            lastCommandId,
                            characterLayers: characterLayerObjs,
                            tags: memberTags,
                            visitCardUrl: memberVisitCardUrl,
                            userRoomToken: memberUserRoomToken,
                            textures: memberTextures,
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
                        };

                        /* This immediately calls open handler, you must not use res after this call */
                        res.upgrade(
                            responseData,
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
                            if (upgradeAborted.aborted) {
                                // If the response points to nowhere, don't attempt an upgrade
                                return;
                            }
                            res.upgrade(
                                {
                                    rejected: true,
                                    reason: e instanceof InvalidTokenError ? tokenInvalidException : null,
                                    status: 401,
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
                                    status: 500,
                                    roomId,
                                } satisfies UpgradeFailedData,
                                websocketKey,
                                websocketProtocol,
                                websocketExtensions,
                                context
                            );
                        }
                    }
                })().catch((e) => console.error(e));
            },
            /* Handlers */
            open: (_ws: WebSocket) => {
                (async () => {
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
                    await socketManager.handleJoinRoom(client);
                    // TODO : Get prefix from Admin and joinSpace prefixed
                    await socketManager.handleJoinSpace(client, client.roomId + "/space");
                    socketManager.emitXMPPSettings(client);

                    //get data information and show messages
                    if (client.messages && Array.isArray(client.messages)) {
                        client.messages.forEach((c: unknown) => {
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

                            if (!client.disconnecting) {
                                client.send(bytes, true);
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
                    console.log("Time taken 2: " + (endTimestamp2 - startTimestamp2) + "ms");

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
                    console.log("Time taken: " + (endTimestamp - startTimestamp) + "ms");
                    */
                })().catch((e) => console.error(e));
            },
            message: (ws, arrayBuffer): void => {
                (async () => {
                    const client = ws as ExSocketInterface;

                    const message = ClientToServerMessage.decode(new Uint8Array(arrayBuffer));

                    if (!message.message) {
                        console.warn("Empty message received.");
                        return;
                    }

                    switch (message.message.$case) {
                        case "viewportMessage": {
                            socketManager.handleViewport(client, message.message.viewportMessage);
                            break;
                        }
                        case "userMovesMessage": {
                            socketManager.handleUserMovesMessage(client, message.message.userMovesMessage);
                            break;
                        }
                        case "playGlobalMessage": {
                            await socketManager.emitPlayGlobalMessage(client, message.message.playGlobalMessage);
                            break;
                        }
                        case "reportPlayerMessage": {
                            await socketManager.handleReportMessage(client, message.message.reportPlayerMessage);
                            break;
                        }
                        case "addSpaceFilterMessage": {
                            socketManager.handleAddSpaceFilterMessage(client, message.message.addSpaceFilterMessage);
                            break;
                        }
                        case "updateSpaceFilterMessage": {
                            socketManager.handleUpdateSpaceFilterMessage(
                                client,
                                message.message.updateSpaceFilterMessage
                            );
                            break;
                        }
                        case "removeSpaceFilterMessage": {
                            socketManager.handleRemoveSpaceFilterMessage(
                                client,
                                message.message.removeSpaceFilterMessage
                            );
                            break;
                        }
                        case "setPlayerDetailsMessage": {
                            socketManager.handleSetPlayerDetails(client, message.message.setPlayerDetailsMessage);
                            break;
                        }
                        case "itemEventMessage":
                        case "variableMessage":
                        case "webRtcSignalToServerMessage":
                        case "webRtcScreenSharingSignalToServerMessage":
                        case "queryMessage":
                        case "emotePromptMessage":
                        case "followRequestMessage":
                        case "followConfirmationMessage":
                        case "followAbortMessage":
                        case "lockGroupPromptMessage":
                        case "pingMessage":
                        case "editMapCommandMessage":
                        case "askPositionMessage": {
                            socketManager.forwardMessageToBack(client, message.message);
                            break;
                        }
                        default: {
                            const _exhaustiveCheck: never = message.message;
                        }
                    }

                    /* Ok is false if backpressure was built up, wait for drain */
                    //let ok = ws.send(message, isBinary);
                })().catch((e) => console.error(e));
            },
            drain: (ws) => {
                console.log("WebSocket backpressure: " + ws.getBufferedAmount());
            },
            close: (ws) => {
                const client = ws as ExSocketInterface;
                try {
                    client.disconnecting = true;
                    socketManager.leaveRoom(client);
                    socketManager.leaveSpaces(client);
                } catch (e) {
                    console.error('An error occurred on "disconnect"');
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
        client.userId = this.nextUserId;
        this.nextUserId++;
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
        client.characterLayers = ws.characterLayers;
        client.companion = ws.companion;
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
        client.spacesFilters = [];
        return client;
    }
}
