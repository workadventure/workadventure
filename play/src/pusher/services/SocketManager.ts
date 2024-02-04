import Debug from "debug";
import type { compressors } from "hyper-express";
import {
    AdminMessage,
    AdminPusherToBackMessage,
    AdminRoomMessage,
    BanMessage,
    EmoteEventMessage,
    ErrorApiData,
    ErrorMessage,
    ErrorScreenMessage,
    JoinRoomMessage,
    MucRoomDefinition,
    PlayerDetailsUpdatedMessage,
    PlayGlobalMessage,
    PusherToBackMessage,
    ReportPlayerMessage,
    ServerToAdminClientMessage,
    ServerToClientMessage,
    UserMovesMessage,
    ViewportMessage,
    XmppSettingsMessage,
    PusherToBackSpaceMessage,
    BackToPusherSpaceMessage,
    PartialSpaceUser,
    AddSpaceFilterMessage,
    UpdateSpaceFilterMessage,
    RemoveSpaceFilterMessage,
    SetPlayerDetailsMessage,
    SpaceFilterMessage,
    WatchSpaceMessage,
    QueryMessage,
    MegaphoneStateMessage,
    UpdateSpaceMetadataMessage,
    BanPlayerMessage,
} from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import axios, { isAxiosError } from "axios";
import { z } from "zod";
import { PusherRoom } from "../models/PusherRoom";
import type { BackSpaceConnection, SocketData } from "../models/Websocket/SocketData";

import { ProtobufUtils } from "../models/Websocket/ProtobufUtils";
import type { GroupDescriptor, UserDescriptor, ZoneEventListener } from "../models/Zone";
import type { AdminConnection, AdminSocketData } from "../models/Websocket/AdminSocketData";
import { EJABBERD_DOMAIN, EMBEDDED_DOMAINS_WHITELIST } from "../enums/EnvironmentVariable";
import { Space } from "../models/Space";
import { UpgradeFailedData } from "../controllers/IoSocketController";
import { emitInBatch } from "./IoSocketHelpers";
import { clientEventsEmitter } from "./ClientEventsEmitter";
import { gaugeManager } from "./GaugeManager";
import { apiClientRepository } from "./ApiClientRepository";
import { adminService } from "./AdminService";
import { ShortMapDescription } from "./ShortMapDescription";

const debug = Debug("socket");

export type AdminSocket = compressors.WebSocket<AdminSocketData>;
export type Socket = compressors.WebSocket<SocketData>;
export type SocketUpgradeFailed = compressors.WebSocket<UpgradeFailedData>;

export class SocketManager implements ZoneEventListener {
    private rooms: Map<string, PusherRoom> = new Map<string, PusherRoom>();
    private spaces: Map<string, Space> = new Map<string, Space>();
    private spaceStreamsToPusher: Map<number, Promise<BackSpaceConnection>> = new Map<
        number,
        Promise<BackSpaceConnection>
    >();

    constructor() {
        clientEventsEmitter.registerToClientJoin((clientUUid: string, roomId: string) => {
            gaugeManager.incNbClientPerRoomGauge(roomId);
        });
        clientEventsEmitter.registerToClientLeave((clientUUid: string, roomId: string) => {
            gaugeManager.decNbClientPerRoomGauge(roomId);
        });
    }

    async handleAdminRoom(client: AdminSocket, roomId: string): Promise<void> {
        const apiClient = await apiClientRepository.getClient(roomId);
        const socketData = client.getUserData();
        const adminRoomStream = apiClient.adminRoom();
        if (!socketData.adminConnections) {
            socketData.adminConnections = new Map<string, AdminConnection>();
        }
        if (socketData.adminConnections.has(roomId)) {
            socketData.adminConnections.get(roomId)?.end();
        }
        socketData.adminConnections.set(roomId, adminRoomStream);

        adminRoomStream
            .on("data", (message: ServerToAdminClientMessage) => {
                if (!message.message) {
                    console.error("Empty message returned on adminRoomStream");
                    return;
                }
                switch (message.message.$case) {
                    case "userJoinedRoom": {
                        const userJoinedRoomMessage = message.message.userJoinedRoom;
                        if (!socketData.disconnecting) {
                            client.send(
                                JSON.stringify({
                                    type: "MemberJoin",
                                    data: {
                                        uuid: userJoinedRoomMessage.uuid,
                                        name: userJoinedRoomMessage.name,
                                        ipAddress: userJoinedRoomMessage.ipAddress,
                                        roomId: roomId,
                                    },
                                })
                            );
                        }
                        break;
                    }
                    case "userLeftRoom": {
                        const userLeftRoomMessage = message.message.userLeftRoom;
                        if (!socketData.disconnecting) {
                            client.send(
                                JSON.stringify({
                                    type: "MemberLeave",
                                    data: {
                                        uuid: userLeftRoomMessage.uuid,
                                    },
                                })
                            );
                        }
                        break;
                    }
                    case "errorMessage": {
                        const errorMessage = message.message.errorMessage;
                        console.error("Error message received from adminRoomStream: " + errorMessage.message);
                        Sentry.captureException("Error message received from adminRoomStream: " + errorMessage.message);
                        if (!socketData.disconnecting) {
                            client.send(
                                JSON.stringify({
                                    type: "Error",
                                    data: {
                                        message: errorMessage.message,
                                    },
                                })
                            );
                        }
                        break;
                    }
                    default: {
                        const _exhaustiveCheck: never = message.message;
                    }
                }
            })
            .on("end", () => {
                // Let's close the front connection if the back connection is closed. This way, we can retry connecting from the start.
                if (!socketData.disconnecting) {
                    console.warn(
                        "Admin connection lost to back server '" +
                            apiClient.getChannel().getTarget() +
                            "' for room '" +
                            roomId +
                            "'"
                    );
                    this.closeWebsocketConnection(client, 1011, "Admin Connection lost to back server");
                }
            })
            .on("error", (err: Error) => {
                console.error(
                    "Error in connection to back server '" +
                        apiClient.getChannel().getTarget() +
                        "' for room '" +
                        roomId +
                        "':",
                    err
                );

                Sentry.captureMessage(
                    "Error in connection to back server '" +
                        apiClient.getChannel().getTarget() +
                        "' for room '" +
                        roomId +
                        err,
                    "debug"
                );
                if (!socketData.disconnecting) {
                    this.closeWebsocketConnection(client, 1011, "Error while connecting to back server");
                }
            });

        const message: AdminPusherToBackMessage = {
            message: {
                $case: "subscribeToRoom",
                subscribeToRoom: roomId,
            },
        };

        console.info(
            `Admin socket handle room ${roomId} connections for a client on ${Buffer.from(
                client.getRemoteAddressAsText()
            ).toString()}`
        );

        adminRoomStream.write(message);
    }

    leaveAdminRoom(socket: AdminSocket): void {
        for (const adminConnection of socket.getUserData().adminConnections?.values() ?? []) {
            adminConnection.end();
        }
    }

    async handleJoinRoom(client: Socket): Promise<void> {
        const socketData = client.getUserData();
        const viewport = socketData.viewport;
        try {
            const joinRoomMessage: JoinRoomMessage = {
                userUuid: socketData.userUuid,
                userJid: socketData.userJid,
                IPAddress: socketData.ipAddress,
                roomId: socketData.roomId,
                name: socketData.name,
                availabilityStatus: socketData.availabilityStatus,
                positionMessage: ProtobufUtils.toPositionMessage(socketData.position),
                tag: socketData.tags,
                isLogged: socketData.isLogged,
                companionTexture: socketData.companionTexture,
                activatedInviteUser:
                    socketData.activatedInviteUser != undefined ? socketData.activatedInviteUser : true,
                canEdit: socketData.canEdit,
                characterTextures: socketData.characterTextures,
                applications: socketData.applications ? socketData.applications : [],
                visitCardUrl: socketData.visitCardUrl ?? "", // TODO: turn this into an optional field
                userRoomToken: socketData.userRoomToken ?? "", // TODO: turn this into an optional field
                lastCommandId: socketData.lastCommandId ?? "", // TODO: turn this into an optional field
            };

            debug("Calling joinRoom '" + socketData.roomId + "'");
            const apiClient = await apiClientRepository.getClient(socketData.roomId);
            const streamToPusher = apiClient.joinRoom();
            clientEventsEmitter.emitClientJoin(socketData.userUuid, socketData.roomId);

            socketData.backConnection = streamToPusher;

            streamToPusher
                .on("data", (message: ServerToClientMessage) => {
                    if (!message.message) {
                        console.error("Empty message returned on streamToPusher");
                        return;
                    }
                    switch (message.message.$case) {
                        case "roomJoinedMessage": {
                            socketData.userId = message.message.roomJoinedMessage.currentUserId;
                            socketData.spaceUser.id = message.message.roomJoinedMessage.currentUserId;

                            // If this is the first message sent, send back the viewport.
                            this.handleViewport(client, viewport);
                            break;
                        }
                        case "refreshRoomMessage": {
                            const refreshMessage = message.message.refreshRoomMessage;
                            this.refreshRoomData(refreshMessage.roomId, refreshMessage.versionNumber);
                            break;
                        }
                    }

                    // Let's pass data over from the back to the client.
                    if (!socketData.disconnecting) {
                        client.send(ServerToClientMessage.encode(message).finish(), true);
                    }
                })
                .on("end", () => {
                    // Let's close the front connection if the back connection is closed. This way, we can retry connecting from the start.
                    if (!socketData.disconnecting) {
                        console.warn(
                            "Connection lost to back server '" +
                                apiClient.getChannel().getTarget() +
                                "' for room '" +
                                socketData.roomId +
                                "'"
                        );
                        this.closeWebsocketConnection(client, 1011, "Connection lost to back server");
                    }
                })
                .on("error", (err: Error) => {
                    const date = new Date();
                    console.error(
                        "Error in connection to back server '" +
                            apiClient.getChannel().getTarget() +
                            "' for room '" +
                            socketData.roomId +
                            "'at :" +
                            date.toLocaleString("en-GB"),
                        err
                    );
                    Sentry.captureMessage(
                        "Error in connection to back server '" +
                            apiClient.getChannel().getTarget() +
                            "' for room '" +
                            socketData.roomId +
                            "': " +
                            socketData.userUuid +
                            err,
                        "debug"
                    );
                    if (!socketData.disconnecting) {
                        this.closeWebsocketConnection(client, 1011, "Error while connecting to back server");
                    }
                });

            const pusherToBackMessage: PusherToBackMessage = {
                message: {
                    $case: "joinRoomMessage",
                    joinRoomMessage,
                },
            };
            streamToPusher.write(pusherToBackMessage);

            const pusherRoom = await this.getOrCreateRoom(socketData.roomId);
            pusherRoom.mucRooms = socketData.mucRooms;
            pusherRoom.join(client);
        } catch (e) {
            Sentry.captureException(`An error occurred on "join_room" event ${e}`);
            console.error(`An error occurred on "join_room" event ${e}`);
        }
    }

    public async handleUpdateSpaceMetadata(
        client: Socket,
        spaceName: string,
        metadata: { [key: string]: unknown }
    ): Promise<void> {
        try {
            const backId = apiClientRepository.getIndex(spaceName);
            const spaceStreamToPusherPromise = this.spaceStreamsToPusher.get(backId);
            if (!spaceStreamToPusherPromise) {
                throw new Error("Space stream to pusher not found");
            }
            await spaceStreamToPusherPromise.then((spaceStreamToPusher) => {
                spaceStreamToPusher.write({
                    message: {
                        $case: "updateSpaceMetadataMessage",
                        updateSpaceMetadataMessage: UpdateSpaceMetadataMessage.fromPartial({
                            spaceName,
                            metadata: JSON.stringify(metadata),
                        }),
                    },
                });
            });
        } catch (error) {
            Sentry.captureException(`An error occurred on "update_space_metadata" event ${error}`);
            console.error(`An error occurred on "update_space_metadata" event ${error}`);
        }
    }

    public async handleJoinSpace(
        client: Socket,
        spaceName: string,
        filter: SpaceFilterMessage | undefined = undefined
    ): Promise<void> {
        const socketData = client.getUserData();

        try {
            const backId = apiClientRepository.getIndex(spaceName);
            let spaceStreamToPusherPromise = this.spaceStreamsToPusher.get(backId);
            const isNewSpaceStream = spaceStreamToPusherPromise === undefined;
            if (!spaceStreamToPusherPromise) {
                spaceStreamToPusherPromise = (async () => {
                    const apiSpaceClient = await apiClientRepository.getSpaceClient(spaceName);
                    const spaceStreamToPusher = apiSpaceClient.watchSpace() as BackSpaceConnection;
                    spaceStreamToPusher
                        .on("data", (message: BackToPusherSpaceMessage) => {
                            if (!message.message) {
                                console.warn("spaceStreamToPusher => Empty message received.", message);
                                return;
                            }
                            switch (message.message.$case) {
                                case "addSpaceUserMessage": {
                                    const addSpaceUserMessage = message.message.addSpaceUserMessage;
                                    const space = this.spaces.get(addSpaceUserMessage.spaceName);
                                    if (space && addSpaceUserMessage.user) {
                                        space.localAddUser(addSpaceUserMessage.user);
                                    }
                                    break;
                                }
                                case "updateSpaceUserMessage": {
                                    const updateSpaceUserMessage = message.message.updateSpaceUserMessage;
                                    const space = this.spaces.get(updateSpaceUserMessage.spaceName);
                                    if (space && updateSpaceUserMessage.user) {
                                        space.localUpdateUser(updateSpaceUserMessage.user);
                                    }
                                    break;
                                }
                                case "removeSpaceUserMessage": {
                                    const removeSpaceUserMessage = message.message.removeSpaceUserMessage;
                                    const space = this.spaces.get(removeSpaceUserMessage.spaceName);
                                    if (space) {
                                        space.localRemoveUser(removeSpaceUserMessage.userId);
                                    }
                                    break;
                                }
                                case "updateSpaceMetadataMessage": {
                                    const updateSpaceMetadataMessage = message.message.updateSpaceMetadataMessage;
                                    const space = this.spaces.get(updateSpaceMetadataMessage.spaceName);

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
                                    if (space) {
                                        space.localUpdateMetadata(isMetadata.data);
                                    }
                                    break;
                                }
                                case "pingMessage": {
                                    if (spaceStreamToPusher) {
                                        if (spaceStreamToPusher.pingTimeout) {
                                            clearTimeout(spaceStreamToPusher.pingTimeout);
                                            spaceStreamToPusher.pingTimeout = undefined;
                                        }
                                        const pusherToBackMessage: PusherToBackSpaceMessage = {
                                            message: {
                                                $case: "pongMessage",
                                                pongMessage: {},
                                            },
                                        } as PusherToBackSpaceMessage;
                                        spaceStreamToPusher.write(pusherToBackMessage);

                                        spaceStreamToPusher.pingTimeout = setTimeout(() => {
                                            if (spaceStreamToPusher) {
                                                debug("[space] spaceStreamToPusher closed, no ping received");
                                                spaceStreamToPusher.end();
                                            }
                                        }, 1000 * 60);
                                    } else {
                                        throw new Error(
                                            "spaceStreamToPusher => Message received but can't answer to it"
                                        );
                                    }
                                    break;
                                }
                                default: {
                                    const _exhaustiveCheck: never = message.message;
                                }
                            }
                        })
                        .on("end", () => {
                            debug("[space] spaceStreamsToPusher ended");
                            this.spaceStreamsToPusher.delete(backId);
                            this.spaces.delete(spaceName);
                        })
                        .on("error", (err: Error) => {
                            console.error(
                                "Error in connection to back server '" +
                                    apiSpaceClient.getChannel().getTarget() +
                                    "' for space '" +
                                    spaceName +
                                    "':",
                                err
                            );
                            Sentry.captureException(
                                "Error in connection to back server '" +
                                    apiSpaceClient.getChannel().getTarget() +
                                    "' for space '" +
                                    spaceName +
                                    "':" +
                                    err
                            );
                        });
                    return spaceStreamToPusher;
                })();
                this.spaceStreamsToPusher.set(backId, spaceStreamToPusherPromise);
            }

            const spaceStreamToPusher = await spaceStreamToPusherPromise;

            if (filter) {
                socketData.spacesFilters.set(spaceName, [filter]);
            }

            let space: Space | undefined = this.spaces.get(spaceName);
            if (!space) {
                space = new Space(spaceName, spaceStreamToPusher, backId, client);
                this.spaces.set(spaceName, space);
            } else {
                space.addClientWatcher(client);
            }
            socketData.spaces.push(space);

            // client.spacesFilters = [
            //     new SpaceFilterMessage()
            //         .setSpacename(spaceName)
            //         .setFiltername(new StringValue().setValue(uuid()))
            //         .setSpacefiltercontainname(new SpaceFilterContainName().setValue("test")),
            // ];

            if (!isNewSpaceStream) {
                space.addUser(socketData.spaceUser);
            } else {
                spaceStreamToPusher.write({
                    message: {
                        $case: "watchSpaceMessage",
                        watchSpaceMessage: WatchSpaceMessage.fromPartial({
                            spaceName,
                            user: socketData.spaceUser,
                        }),
                    },
                });
                space.localAddUser(socketData.spaceUser);
            }
        } catch (e) {
            Sentry.captureException(`An error occurred on "join_space" event ${e}`);
            console.error(`An error occurred on "join_space" event ${e}`);
        }
    }

    private closeWebsocketConnection(client: Socket | AdminSocket, code: number, reason: string): void {
        client.getUserData().disconnecting = true;
        client.end(code, reason);
    }

    handleViewport(client: Socket, viewport: ViewportMessage): void {
        const socketData = client.getUserData();
        try {
            socketData.viewport = viewport;

            const room = this.rooms.get(socketData.roomId);
            if (!room) {
                console.error("In SET_VIEWPORT, could not find world with id '", socketData.roomId, "'");
                Sentry.captureException("In SET_VIEWPORT, could not find world with id ' " + socketData.roomId);
                return;
            }
            room.setViewport(client, socketData.viewport);
        } catch (e) {
            Sentry.captureException(`An error occurred on "SET_VIEWPORT" event ${e}`);
            console.error(`An error occurred on "SET_VIEWPORT" event ${e}`);
        }
    }

    handleUserMovesMessage(client: Socket, userMovesMessage: UserMovesMessage): void {
        const socketData = client.getUserData();
        if (!socketData.backConnection) {
            Sentry.captureException("Client has no back connection");
            throw new Error("Client has no back connection");
        }

        socketData.backConnection.write({
            message: {
                $case: "userMovesMessage",
                userMovesMessage,
            },
        });

        const viewport = userMovesMessage.viewport;
        if (viewport === undefined) {
            throw new Error("Missing viewport in UserMovesMessage");
        }

        // Now, we need to listen to the correct viewport.
        this.handleViewport(client, viewport);
    }

    onEmote(emoteMessage: EmoteEventMessage, listener: Socket): void {
        emitInBatch(listener, {
            message: {
                $case: "emoteEventMessage",
                emoteEventMessage: emoteMessage,
            },
        });
    }

    onPlayerDetailsUpdated(playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage, listener: Socket): void {
        emitInBatch(listener, {
            message: {
                $case: "playerDetailsUpdatedMessage",
                playerDetailsUpdatedMessage,
            },
        });
    }

    onError(errorMessage: ErrorMessage, listener: Socket): void {
        emitInBatch(listener, {
            message: {
                $case: "errorMessage",
                errorMessage,
            },
        });
    }

    // Useless now, will be useful again if we allow editing details in game
    handleSetPlayerDetails(client: Socket, playerDetailsMessage: SetPlayerDetailsMessage): void {
        const socketData = client.getUserData();
        const pusherToBackMessage: PusherToBackMessage["message"] = {
            $case: "setPlayerDetailsMessage",
            setPlayerDetailsMessage: playerDetailsMessage,
        };
        socketManager.forwardMessageToBack(client, pusherToBackMessage);

        if (socketData.spaceUser.availabilityStatus !== playerDetailsMessage.availabilityStatus) {
            socketData.spaceUser.availabilityStatus = playerDetailsMessage.availabilityStatus;
            const partialSpaceUser: PartialSpaceUser = PartialSpaceUser.fromPartial({
                availabilityStatus: playerDetailsMessage.availabilityStatus,
                id: socketData.userId,
            });
            socketData.spaces.forEach((space) => {
                space.updateUser(partialSpaceUser);
            });
        }
    }

    async handleReportMessage(client: Socket, reportPlayerMessage: ReportPlayerMessage): Promise<void> {
        const socketData = client.getUserData();
        try {
            await adminService.reportPlayer(
                reportPlayerMessage.reportedUserUuid,
                reportPlayerMessage.reportComment,
                socketData.userUuid,
                socketData.roomId,
                "en"
            );
        } catch (e) {
            Sentry.captureException(`An error occurred on "handleReportMessage" ${e}`);
            console.error(`An error occurred on "handleReportMessage" ${e}`);
        }
    }

    async handleBanPlayerMessage(client: Socket, banPlayerMessage: BanPlayerMessage): Promise<void> {
        const socketData = client.getUserData();
        // Ban player only if the user is admin
        if (!socketData.tags.includes("admin")) return;
        try {
            await adminService.banUserByUuid(
                banPlayerMessage.banUserUuid,
                socketData.roomId,
                banPlayerMessage.banUserName,
                `User banned by admin ${socketData.userUuid}`,
                socketData.userUuid
            );
            await this.emitBan(
                banPlayerMessage.banUserUuid,
                "You have been banned by an admin",
                "ban",
                socketData.roomId
            );
        } catch (e) {
            Sentry.captureException(`An error occurred on "handleBanPlayerMessage" ${e}`);
            console.error(`An error occurred on "handleBanPlayerMessage" ${e}`);
        }
    }

    leaveRoom(socket: Socket): void {
        // leave previous room and world
        const socketData = socket.getUserData();
        try {
            if (socketData.roomId) {
                try {
                    //user leaves room
                    const room: PusherRoom | undefined = this.rooms.get(socketData.roomId);
                    if (room) {
                        debug("Leaving room %s.", socketData.roomId);

                        room.leave(socket);
                        this.deleteRoomIfEmpty(room);
                    } else {
                        console.error("Could not find the GameRoom the user is leaving!");
                        Sentry.captureException("Could not find the GameRoom the user is leaving!");
                    }
                    //user leave previous room
                    //Client.leave(Client.roomId);
                } finally {
                    //delete Client.roomId;
                    clientEventsEmitter.emitClientLeave(socketData.userUuid, socketData.roomId);
                    debug("User ", socketData.name, " left: ", socketData.userUuid);
                }
            }
        } finally {
            if (socketData.backConnection) {
                socketData.backConnection.end();
            }
        }
    }

    leaveSpaces(socket: Socket) {
        const socketData = socket.getUserData();
        socketData.spacesFilters = new Map<string, SpaceFilterMessage[]>();
        (socketData.spaces ?? []).forEach((space) => {
            space.removeClientWatcher(socket);
            space.removeUser(socketData.spaceUser.id);
            this.deleteSpaceIfEmpty(space);
        });
        socketData.spaces = [];
    }

    private deleteSpaceIfEmpty(space: Space) {
        if (space.isEmpty()) {
            this.spaces.delete(space.name);
            debug("Space %s is empty. Deleting.", space.name);
            if ([...this.spaces.values()].filter((_space) => _space.backId === space.backId).length === 0) {
                const spaceStreamPusher = this.spaceStreamsToPusher.get(space.backId);
                if (spaceStreamPusher) {
                    spaceStreamPusher
                        .then((connection) => connection.end())
                        .catch((e) => console.error("ERROR WHILE CLOSING CONNECTION", e));
                    this.spaceStreamsToPusher.delete(space.backId);
                    debug("Connection to back %d useless. Ending.", space.backId);
                }
            }
        }
    }

    private deleteRoomIfEmpty(room: PusherRoom): void {
        if (room.isEmpty()) {
            room.close();
            this.rooms.delete(room.roomUrl);
            debug("Room %s is empty. Deleting.", room.roomUrl);
        }
    }

    public deleteRoomIfEmptyFromId(roomUrl: string): void {
        const room = this.rooms.get(roomUrl);
        if (room) {
            this.deleteRoomIfEmpty(room);
        }
    }

    async getOrCreateRoom(roomUrl: string): Promise<PusherRoom> {
        //check and create new world for a room
        let room = this.rooms.get(roomUrl);
        if (room === undefined) {
            room = new PusherRoom(roomUrl, this);
            await room.init();
            this.rooms.set(roomUrl, room);
        }
        return room;
    }

    public getWorlds(): Map<string, PusherRoom> {
        return this.rooms;
    }

    public async emitSendUserMessage(userUuid: string, message: string, type: string, roomId: string): Promise<void> {
        /*const client = this.searchClientByUuid(userUuid);
        if(client) {
            const adminMessage = new SendUserMessage();
            adminMessage.setMessage(message);
            adminMessage.setType(type);
            const pusherToBackMessage = new PusherToBackMessage();
            pusherToBackMessage.setSendusermessage(adminMessage);
            client.backConnection.write(pusherToBackMessage);
            return;
        }*/

        const backConnection = await apiClientRepository.getClient(roomId);
        const backAdminMessage: AdminMessage = {
            message,
            roomId,
            recipientUuid: userUuid,
            type,
        };
        backConnection.sendAdminMessage(backAdminMessage, (error: unknown) => {
            if (error !== null) {
                Sentry.captureException(`Error while sending admin message ${error}`);
                console.error(`Error while sending admin message ${error}`);
            }
        });
    }

    public async emitBan(userUuid: string, message: string, type: string, roomId: string): Promise<void> {
        const backConnection = await apiClientRepository.getClient(roomId);
        const banMessage: BanMessage = {
            message,
            roomId,
            recipientUuid: userUuid,
            type,
        };
        backConnection.ban(banMessage, (error: unknown) => {
            if (error !== null) {
                Sentry.captureException("Error while sending admin message", error);
                console.error("Error while sending admin message", error);
            }
        });
    }

    public onUserEnters(user: UserDescriptor, listener: Socket): void {
        emitInBatch(listener, {
            message: {
                $case: "userJoinedMessage",
                userJoinedMessage: user.toUserJoinedMessage(),
            },
        });
    }

    public onUserMoves(user: UserDescriptor, listener: Socket): void {
        emitInBatch(listener, {
            message: {
                $case: "userMovedMessage",
                userMovedMessage: user.toUserMovedMessage(),
            },
        });
    }

    public onUserLeaves(userId: number, listener: Socket): void {
        emitInBatch(listener, {
            message: {
                $case: "userLeftMessage",
                userLeftMessage: {
                    userId,
                },
            },
        });
    }

    public onGroupEnters(group: GroupDescriptor, listener: Socket): void {
        emitInBatch(listener, {
            message: {
                $case: "groupUpdateMessage",
                groupUpdateMessage: group.toGroupUpdateMessage(),
            },
        });
    }

    public onGroupMoves(group: GroupDescriptor, listener: Socket): void {
        this.onGroupEnters(group, listener);
    }

    public onGroupLeaves(groupId: number, listener: Socket): void {
        emitInBatch(listener, {
            message: {
                $case: "groupDeleteMessage",
                groupDeleteMessage: {
                    groupId,
                },
            },
        });
    }

    public emitWorldFullMessage(client: Socket): void {
        const socketData = client.getUserData();
        if (!socketData.disconnecting) {
            client.send(
                ServerToClientMessage.encode({
                    message: {
                        $case: "worldFullMessage",
                        worldFullMessage: {},
                    },
                }).finish(),
                true
            );
        }
    }

    public emitTokenExpiredMessage(client: SocketUpgradeFailed): void {
        client.send(
            ServerToClientMessage.encode({
                message: {
                    $case: "tokenExpiredMessage",
                    tokenExpiredMessage: {},
                },
            }).finish(),
            true
        );
    }

    public emitInvalidCharacterTextureMessage(client: SocketUpgradeFailed): void {
        client.send(
            ServerToClientMessage.encode({
                message: {
                    $case: "invalidCharacterTextureMessage",
                    invalidCharacterTextureMessage: {
                        message: "Invalid character textures",
                    },
                },
            }).finish(),
            true
        );
    }

    public emitInvalidCompanionTextureMessage(client: SocketUpgradeFailed): void {
        client.send(
            ServerToClientMessage.encode({
                message: {
                    $case: "invalidCompanionTextureMessage",
                    invalidCompanionTextureMessage: {
                        message: "Invalid companion texture",
                    },
                },
            }).finish(),
            true
        );
    }

    public emitConnectionErrorMessage(client: SocketUpgradeFailed, message: string): void {
        client.send(
            ServerToClientMessage.encode({
                message: {
                    $case: "worldConnectionMessage",
                    worldConnectionMessage: {
                        message,
                    },
                },
            }).finish(),
            true
        );
    }

    public emitErrorScreenMessage(client: SocketUpgradeFailed, errorApi: ErrorApiData): void {
        // FIXME: improve typing of ErrorScreenMessage
        const errorScreenMessage: ErrorScreenMessage = {
            type: errorApi.type,
            code: "",
            title: undefined,
            subtitle: "",
            details: "",
            image: "",
            buttonTitle: "",
            canRetryManual: false,
            timeToRetry: 0,
            urlToRedirect: "",
        };

        if (errorApi.type == "retry" || errorApi.type == "error" || errorApi.type == "unauthorized") {
            errorScreenMessage.code = errorApi.code;
            errorScreenMessage.title = errorApi.title;
            errorScreenMessage.subtitle = errorApi.subtitle;
            errorScreenMessage.details = errorApi.details;
            errorScreenMessage.image = errorApi.image;
            if (errorApi.type == "unauthorized" && errorApi.buttonTitle) {
                errorScreenMessage.buttonTitle = errorApi.buttonTitle;
            }
        }
        if (errorApi.type == "retry") {
            if (errorApi.buttonTitle) {
                errorScreenMessage.buttonTitle = errorApi.buttonTitle;
            }
            if (errorApi.canRetryManual !== undefined) errorScreenMessage.canRetryManual = errorApi.canRetryManual;
            if (errorApi.timeToRetry) errorScreenMessage.timeToRetry = errorApi.timeToRetry;
        }
        if (errorApi.type == "redirect" && errorApi.urlToRedirect) {
            errorScreenMessage.urlToRedirect = errorApi.urlToRedirect;
        }

        //if (!client.disconnecting) {
        client.send(
            ServerToClientMessage.encode({
                message: {
                    $case: "errorScreenMessage",
                    errorScreenMessage,
                },
            }).finish(),
            true
        );
        //}
    }

    private refreshRoomData(roomId: string, versionNumber: number): void {
        const room = this.rooms.get(roomId);
        //this function is run for every users connected to the room, so we need to make sure the room wasn't already refreshed.
        if (!room || !room.needsUpdate(versionNumber)) return;
        //TODO check right of user in admin
    }

    public async emitPlayGlobalMessage(client: Socket, playGlobalMessageEvent: PlayGlobalMessage): Promise<void> {
        const socketData = client.getUserData();
        if (!socketData.tags.includes("admin")) {
            throw new Error("Client is not an admin!");
        }

        const clientRoomUrl = socketData.roomId;
        let tabUrlRooms: string[];

        if (playGlobalMessageEvent.broadcastToWorld) {
            const shortDescriptions = await adminService.getUrlRoomsFromSameWorld(clientRoomUrl, "en");
            tabUrlRooms = shortDescriptions.map((shortDescription) => shortDescription.roomUrl);
        } else {
            tabUrlRooms = [clientRoomUrl];
        }

        for (const roomUrl of tabUrlRooms) {
            //eslint-disable-next-line no-await-in-loop
            const apiRoom = await apiClientRepository.getClient(roomUrl);
            const roomMessage: AdminRoomMessage = {
                message: playGlobalMessageEvent.content,
                type: playGlobalMessageEvent.type,
                roomId: roomUrl,
            };
            apiRoom.sendAdminMessageToRoom(roomMessage, () => {
                return;
            });
        }
    }

    forwardMessageToBack(client: Socket, message: PusherToBackMessage["message"]): void {
        const socketData = client.getUserData();
        const pusherToBackMessage: PusherToBackMessage = {
            message: message,
        };

        if (!socketData.backConnection) {
            Sentry.captureException(new Error("forwardMessageToBack => client.backConnection is undefined"));
            throw new Error("forwardMessageToBack => client.backConnection is undefined");
        }

        socketData.backConnection.write(pusherToBackMessage);
    }

    emitXMPPSettings(client: Socket): void {
        const socketData = client.getUserData();
        const xmppSettings: XmppSettingsMessage = {
            conferenceDomain: "conference." + EJABBERD_DOMAIN,
            rooms: socketData.mucRooms.map((definition: MucRoomDefinition) => {
                if (!definition.name || !definition.url || !definition.type) {
                    throw new Error("Name URL and type cannot be empty!");
                }
                return {
                    name: definition.name,
                    url: definition.url,
                    type: definition.type,
                    subscribe: definition.subscribe,
                };
            }),
            jabberId: socketData.jabberId,
            jabberPassword: socketData.jabberPassword ?? "",
        };

        if (!socketData.disconnecting) {
            client.send(
                ServerToClientMessage.encode({
                    message: {
                        $case: "xmppSettingsMessage",
                        xmppSettingsMessage: xmppSettings,
                    },
                }).finish(),
                true
            );
        }
    }

    handleAddSpaceFilterMessage(client: Socket, addSpaceFilterMessage: AddSpaceFilterMessage) {
        const newFilter = addSpaceFilterMessage.spaceFilterMessage;
        const socketData = client.getUserData();
        if (newFilter) {
            const space = socketData.spaces.find((space) => space.name === newFilter.spaceName);
            if (space) {
                space.handleAddFilter(client, addSpaceFilterMessage);
                let spacesFilter = socketData.spacesFilters.get(space.name);
                if (!spacesFilter) {
                    spacesFilter = [newFilter];
                } else {
                    spacesFilter.push(newFilter);
                }
                socketData.spacesFilters.set(space.name, spacesFilter);
            }
        }
    }

    handleUpdateSpaceFilterMessage(client: Socket, updateSpaceFilterMessage: UpdateSpaceFilterMessage) {
        const newFilter = updateSpaceFilterMessage.spaceFilterMessage;
        const socketData = client.getUserData();
        if (newFilter) {
            const space = socketData.spaces.find((space) => space.name === newFilter.spaceName);
            if (space) {
                space.handleUpdateFilter(client, updateSpaceFilterMessage);
                const spacesFilter = socketData.spacesFilters.get(space.name);
                if (spacesFilter) {
                    socketData.spacesFilters.set(
                        space.name,
                        spacesFilter.map((filter) => (filter.filterName === newFilter.filterName ? newFilter : filter))
                    );
                } else {
                    console.trace(
                        `SocketManager => handleUpdateSpaceFilterMessage => spacesFilter ${updateSpaceFilterMessage.spaceFilterMessage?.filterName} is undefined`
                    );
                }
            }
        }
    }

    handleRemoveSpaceFilterMessage(client: Socket, removeSpaceFilterMessage: RemoveSpaceFilterMessage) {
        const oldFilter = removeSpaceFilterMessage.spaceFilterMessage;
        const socketData = client.getUserData();
        if (oldFilter) {
            const space = socketData.spaces.find((space) => space.name === oldFilter.spaceName);
            if (space) {
                space.handleRemoveFilter(client, removeSpaceFilterMessage);
                const spacesFilter = socketData.spacesFilters.get(space.name);
                if (spacesFilter) {
                    socketData.spacesFilters.set(
                        space.name,
                        spacesFilter.filter((filter) => filter.filterName !== oldFilter.filterName)
                    );
                } else {
                    console.trace(
                        `SocketManager => handleRemoveSpaceFilterMessage => spacesFilter ${removeSpaceFilterMessage.spaceFilterMessage?.filterName} is undefined`
                    );
                }
            }
        }
    }

    handleCameraState(client: Socket, state: boolean) {
        const socketData = client.getUserData();
        socketData.cameraState = state;
        socketData.spaceUser.cameraState = state;
        const partialSpaceUser: PartialSpaceUser = PartialSpaceUser.fromPartial({
            cameraState: state,
            id: socketData.userId,
        });
        socketData.spaces.forEach((space) => {
            space.updateUser(partialSpaceUser);
        });
    }

    handleMicrophoneState(client: Socket, state: boolean) {
        const socketData = client.getUserData();
        socketData.microphoneState = state;
        socketData.spaceUser.microphoneState = state;
        const partialSpaceUser: PartialSpaceUser = PartialSpaceUser.fromPartial({
            microphoneState: state,
            id: socketData.userId,
        });
        socketData.spaces.forEach((space) => {
            space.updateUser(partialSpaceUser);
        });
    }

    handleScreenSharingState(client: Socket, state: boolean) {
        const socketData = client.getUserData();
        socketData.screenSharingState = state;
        socketData.spaceUser.screenSharingState = state;
        const partialSpaceUser: PartialSpaceUser = PartialSpaceUser.fromPartial({
            screenSharingState: state,
            id: socketData.userId,
        });
        socketData.spaces.forEach((space) => {
            space.updateUser(partialSpaceUser);
        });
    }

    handleMegaphoneState(client: Socket, megaphoneStateMessage: MegaphoneStateMessage) {
        const socketData = client.getUserData();
        socketData.megaphoneState = megaphoneStateMessage.value;
        socketData.spaceUser.megaphoneState = megaphoneStateMessage.value;
        const partialSpaceUser: PartialSpaceUser = PartialSpaceUser.fromPartial({
            megaphoneState: megaphoneStateMessage.value,
            id: socketData.userId,
        });
        socketData.spaces
            .filter((space) => !megaphoneStateMessage.spaceName || space.name === megaphoneStateMessage.spaceName)
            .forEach((space) => {
                space.updateUser(partialSpaceUser);
            });
    }

    handleJitsiParticipantIdSpace(client: Socket, spaceName: string, jitsiParticipantId: string) {
        const socketData = client.getUserData();
        const space = socketData.spaces.find((space) => space.name === spaceName);
        if (space) {
            const partialSpaceUser: PartialSpaceUser = PartialSpaceUser.fromPartial({
                jitsiParticipantId,
                id: socketData.userId,
            });
            space.updateUser(partialSpaceUser);
        }
    }

    async handleRoomTagsQuery(client: Socket, queryMessage: QueryMessage) {
        let tags: string[];
        try {
            tags = await adminService.getTagsList(client.getUserData().roomId);
        } catch (e) {
            console.warn("SocketManager => handleRoomTagsQuery => error while getting tags list", e);
            // Nothing to do with the error
            tags = [];
        }
        client.send(
            ServerToClientMessage.encode({
                message: {
                    $case: "answerMessage",
                    answerMessage: {
                        id: queryMessage.id,
                        answer: {
                            $case: "roomTagsAnswer",
                            roomTagsAnswer: {
                                tags,
                            },
                        },
                    },
                },
            }).finish(),
            true
        );
    }

    async handleRoomsFromSameWorldQuery(client: Socket, queryMessage: QueryMessage) {
        let roomDescriptions: ShortMapDescription[];
        try {
            roomDescriptions = await adminService.getUrlRoomsFromSameWorld(client.getUserData().roomId);
        } catch (e) {
            console.warn("SocketManager => handleRoomsFromSameWorldQuery => error while getting other rooms list", e);
            // Nothing to do with the error
            Sentry.captureException(e);
            client.send(
                ServerToClientMessage.encode({
                    message: {
                        $case: "answerMessage",
                        answerMessage: {
                            id: queryMessage.id,
                            answer: {
                                $case: "error",
                                error: {
                                    message: e instanceof Error ? e.message + e.stack : "Unknown error",
                                },
                            },
                        },
                    },
                }).finish(),
                true
            );
            return;
        }
        client.send(
            ServerToClientMessage.encode({
                message: {
                    $case: "answerMessage",
                    answerMessage: {
                        id: queryMessage.id,
                        answer: {
                            $case: "roomsFromSameWorldAnswer",
                            roomsFromSameWorldAnswer: {
                                roomDescriptions,
                            },
                        },
                    },
                },
            }).finish(),
            true
        );
    }

    handleLeaveSpace(client: Socket, spaceName: string) {
        const socketData = client.getUserData();
        const space = this.spaces.get(spaceName);
        if (space) {
            space.removeClientWatcher(client);
            space.removeUser(socketData.spaceUser.id);
            socketData.spaces = socketData.spaces.filter((space) => space.name !== spaceName);
            this.deleteSpaceIfEmpty(space);
        }
    }

    async handleEmbeddableWebsiteQuery(client: Socket, queryMessage: QueryMessage) {
        if (queryMessage.query?.$case !== "embeddableWebsiteQuery") {
            return;
        }

        const url = queryMessage.query.embeddableWebsiteQuery.url;

        const emitAnswerMessage = (state: boolean, embeddable: boolean, message: string | undefined = undefined) => {
            client.send(
                ServerToClientMessage.encode({
                    message: {
                        $case: "answerMessage",
                        answerMessage: {
                            id: queryMessage.id,
                            answer: {
                                $case: "embeddableWebsiteAnswer",
                                embeddableWebsiteAnswer: {
                                    url,
                                    state,
                                    embeddable,
                                    message,
                                },
                            },
                        },
                    },
                }).finish(),
                true
            );
        };

        // If the URL is in the white list, we send a message to the client
        if (verifyUrlAsDomainInWhiteList(url)) {
            return emitAnswerMessage(true, true);
        }

        const processError = (error: { response: { status: number } }) => {
            // If the error is a 999 error, it means that this is LinkedIn that return this error code because the website is not embeddable and is not reachable by axios
            if (isAxiosError(error) && error.response?.status === 999) {
                emitAnswerMessage(true, false);
            } else {
                debug(`SocketManager => embeddableUrl : ${url} ${error}`);
                // If the URL is not reachable, we send a message to the client
                // Catch is used to avoid crash if the client is disconnected
                try {
                    emitAnswerMessage(false, false, "URL is not reachable");
                } catch (e) {
                    console.error(e);
                }
            }
        };

        await axios
            .head(url, { timeout: 5_000 })
            // Klaxoon
            .then((response) => emitAnswerMessage(true, !response.headers["x-frame-options"]))
            .catch(async (error) => {
                // If response from server is "Method not allowed", we try to do a GET request
                if (isAxiosError(error) && error.response?.status === 405) {
                    await axios
                        .get(url, { timeout: 5_000 })
                        .then((response) => emitAnswerMessage(true, !response.headers["x-frame-options"]))
                        .catch((error) => processError(error));
                } else {
                    processError(error);
                }
            });
    }
}

// Verify that the domain of the url in parameter is in the white list of embeddable domains defined in the .env file (EMBEDDED_DOMAINS_WHITELIST)
const verifyUrlAsDomainInWhiteList = (url: string) => {
    return EMBEDDED_DOMAINS_WHITELIST.some((domain) => url.includes(domain));
};

export const socketManager = new SocketManager();
