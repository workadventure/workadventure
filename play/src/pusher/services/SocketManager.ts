import Debug from "debug";
import type { compressors } from "hyper-express";
import {
    AdminMessage,
    AdminPusherToBackMessage,
    AdminRoomMessage,
    BanMessage,
    BanUserByUuidMessage,
    CharacterLayerMessage,
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
} from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import { PusherRoom } from "../models/PusherRoom";
import type { ExSocketInterface, BackSpaceConnection } from "../models/Websocket/ExSocketInterface";

import { ProtobufUtils } from "../models/Websocket/ProtobufUtils";
import type { GroupDescriptor, UserDescriptor, ZoneEventListener } from "../models/Zone";
import type { AdminConnection, ExAdminSocketInterface } from "../models/Websocket/ExAdminSocketInterface";
import { EJABBERD_DOMAIN } from "../enums/EnvironmentVariable";
import { Space } from "../models/Space";
import { emitInBatch } from "./IoSocketHelpers";
import { clientEventsEmitter } from "./ClientEventsEmitter";
import { gaugeManager } from "./GaugeManager";
import { apiClientRepository } from "./ApiClientRepository";
import { adminService } from "./AdminService";

const debug = Debug("socket");

interface AdminSocketRoomsList {
    [index: string]: number;
}

interface AdminSocketUsersList {
    [index: string]: boolean;
}

export interface AdminSocketData {
    rooms: AdminSocketRoomsList;
    users: AdminSocketUsersList;
}

export class SocketManager implements ZoneEventListener {
    private rooms: Map<string, PusherRoom> = new Map<string, PusherRoom>();
    private spaces: Map<string, Space> = new Map<string, Space>();
    private spaceStreamsToPusher: Map<number, BackSpaceConnection> = new Map<number, BackSpaceConnection>();

    constructor() {
        clientEventsEmitter.registerToClientJoin((clientUUid: string, roomId: string) => {
            gaugeManager.incNbClientPerRoomGauge(roomId);
        });
        clientEventsEmitter.registerToClientLeave((clientUUid: string, roomId: string) => {
            gaugeManager.decNbClientPerRoomGauge(roomId);
        });
    }

    async handleAdminRoom(client: ExAdminSocketInterface, roomId: string): Promise<void> {
        const apiClient = await apiClientRepository.getClient(roomId);
        const adminRoomStream = apiClient.adminRoom();
        if (!client.adminConnections) {
            client.adminConnections = new Map<string, AdminConnection>();
        }
        if (client.adminConnections.has(roomId)) {
            client.adminConnections.get(roomId)?.end();
        }
        client.adminConnections.set(roomId, adminRoomStream);

        adminRoomStream
            .on("data", (message: ServerToAdminClientMessage) => {
                if (!message.message) {
                    console.error("Empty message returned on adminRoomStream");
                    return;
                }
                switch (message.message.$case) {
                    case "userJoinedRoom": {
                        const userJoinedRoomMessage = message.message.userJoinedRoom;
                        if (!client.disconnecting) {
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
                        if (!client.disconnecting) {
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
                        if (!client.disconnecting) {
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
                if (!client.disconnecting) {
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
                if (!client.disconnecting) {
                    this.closeWebsocketConnection(client, 1011, "Error while connecting to back server");
                }
            });

        const message: AdminPusherToBackMessage = {
            message: {
                $case: "subscribeToRoom",
                subscribeToRoom: roomId,
            },
        };

        console.log(
            `Admin socket handle room ${roomId} connections for a client on ${Buffer.from(
                client.getRemoteAddressAsText()
            ).toString()}`
        );

        adminRoomStream.write(message);
    }

    leaveAdminRoom(socket: ExAdminSocketInterface): void {
        for (const adminConnection of socket.adminConnections?.values() ?? []) {
            adminConnection.end();
        }
    }

    async handleJoinRoom(client: ExSocketInterface): Promise<void> {
        const viewport = client.viewport;
        try {
            const joinRoomMessage: JoinRoomMessage = {
                userUuid: client.userUuid,
                userJid: client.userJid,
                IPAddress: client.IPAddress,
                roomId: client.roomId,
                name: client.name,
                availabilityStatus: client.availabilityStatus,
                positionMessage: ProtobufUtils.toPositionMessage(client.position),
                tag: client.tags,
                isLogged: client.isLogged,
                companion: client.companion,
                activatedInviteUser: client.activatedInviteUser != undefined ? client.activatedInviteUser : true,
                canEdit: client.canEdit,
                characterLayer: [],
                applications: [],
                visitCardUrl: client.visitCardUrl ?? "", // TODO: turn this into an optional field
                userRoomToken: client.userRoomToken ?? "", // TODO: turn this into an optional field
                lastCommandId: client.lastCommandId ?? "", // TODO: turn this into an optional field
            };

            if (client.applications != undefined) {
                for (const applicationValue of client.applications) {
                    joinRoomMessage.applications.push({
                        name: applicationValue.name,
                        script: applicationValue.script,
                    });
                }
            }

            for (const characterLayer of client.characterLayers) {
                const characterLayerMessage: CharacterLayerMessage = {
                    name: characterLayer.id,
                    url: characterLayer.url ?? "", // FIXME: turn this into an optional field
                    layer: characterLayer.layer ?? "", // FIXME: turn this into an optional field
                };

                joinRoomMessage.characterLayer.push(characterLayerMessage);
            }

            debug("Calling joinRoom '" + client.roomId + "'");
            const apiClient = await apiClientRepository.getClient(client.roomId);
            const streamToPusher = apiClient.joinRoom();
            clientEventsEmitter.emitClientJoin(client.userUuid, client.roomId);

            client.backConnection = streamToPusher;

            streamToPusher
                .on("data", (message: ServerToClientMessage) => {
                    if (!message.message) {
                        console.error("Empty message returned on streamToPusher");
                        return;
                    }
                    switch (message.message.$case) {
                        case "roomJoinedMessage": {
                            client.userId = message.message.roomJoinedMessage.currentUserId;
                            client.spaceUser.id = message.message.roomJoinedMessage.currentUserId;

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
                    if (!client.disconnecting) {
                        client.send(ServerToClientMessage.encode(message).finish(), true);
                    }
                })
                .on("end", () => {
                    // Let's close the front connection if the back connection is closed. This way, we can retry connecting from the start.
                    if (!client.disconnecting) {
                        console.warn(
                            "Connection lost to back server '" +
                                apiClient.getChannel().getTarget() +
                                "' for room '" +
                                client.roomId +
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
                            client.roomId +
                            "'at :" +
                            date.toLocaleString("en-GB"),
                        err
                    );
                    Sentry.captureMessage(
                        "Error in connection to back server '" +
                            apiClient.getChannel().getTarget() +
                            "' for room '" +
                            client.roomId +
                            "': " +
                            client.userUuid +
                            err,
                        "debug"
                    );
                    if (!client.disconnecting) {
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

            const pusherRoom = await this.getOrCreateRoom(client.roomId);
            pusherRoom.mucRooms = client.mucRooms;
            pusherRoom.join(client);
        } catch (e) {
            Sentry.captureException(`An error occurred on "join_room" event ${e}`);
            console.error(`An error occurred on "join_room" event ${e}`);
        }
    }

    public async handleJoinSpace(
        client: ExSocketInterface,
        spaceName: string,
        filter: SpaceFilterMessage | undefined = undefined
    ): Promise<void> {
        try {
            const backId = apiClientRepository.getIndex(spaceName);
            let spaceStreamToPusher = this.spaceStreamsToPusher.get(backId);
            if (!spaceStreamToPusher) {
                const apiSpaceClient = await apiClientRepository.getSpaceClient(spaceName);
                spaceStreamToPusher = apiSpaceClient.watchSpace() as BackSpaceConnection;
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
                                    throw new Error("spaceStreamToPusher => Message received but can't answer to it");
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
            }

            if (filter) {
                client.spacesFilters.set(spaceName, [filter]);
            }

            let space: Space | undefined = this.spaces.get(spaceName);
            if (!space) {
                space = new Space(spaceName, spaceStreamToPusher, backId, client);
                this.spaces.set(spaceName, space);
            } else {
                space.addClientWatcher(client);
            }
            client.spaces.push(space);

            // client.spacesFilters = [
            //     new SpaceFilterMessage()
            //         .setSpacename(spaceName)
            //         .setFiltername(new StringValue().setValue(uuid()))
            //         .setSpacefiltercontainname(new SpaceFilterContainName().setValue("test")),
            // ];

            if (this.spaceStreamsToPusher.has(backId)) {
                space.addUser(client.spaceUser);
            } else {
                this.spaceStreamsToPusher.set(backId, spaceStreamToPusher);
                spaceStreamToPusher.write({
                    message: {
                        $case: "watchSpaceMessage",
                        watchSpaceMessage: WatchSpaceMessage.fromPartial({
                            spaceName,
                            user: client.spaceUser,
                        }),
                    },
                });
                space.localAddUser(client.spaceUser);
            }
        } catch (e) {
            Sentry.captureException(`An error occurred on "join_space" event ${e}`);
            console.error(`An error occurred on "join_space" event ${e}`);
        }
    }

    private closeWebsocketConnection(
        client: ExSocketInterface | ExAdminSocketInterface,
        code: number,
        reason: string
    ): void {
        client.disconnecting = true;
        //this.leaveRoom(client);
        //client.close();
        client.end(code, reason);
    }

    handleViewport(client: ExSocketInterface, viewport: ViewportMessage): void {
        try {
            client.viewport = viewport;

            const room = this.rooms.get(client.roomId);
            if (!room) {
                console.error("In SET_VIEWPORT, could not find world with id '", client.roomId, "'");
                Sentry.captureException("In SET_VIEWPORT, could not find world with id ' " + client.roomId);
                return;
            }
            room.setViewport(client, client.viewport);
        } catch (e) {
            Sentry.captureException(`An error occurred on "SET_VIEWPORT" event ${e}`);
            console.error(`An error occurred on "SET_VIEWPORT" event ${e}`);
        }
    }

    handleUserMovesMessage(client: ExSocketInterface, userMovesMessage: UserMovesMessage): void {
        client.backConnection.write({
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

    onEmote(emoteMessage: EmoteEventMessage, listener: ExSocketInterface): void {
        emitInBatch(listener, {
            message: {
                $case: "emoteEventMessage",
                emoteEventMessage: emoteMessage,
            },
        });
    }

    onPlayerDetailsUpdated(
        playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage,
        listener: ExSocketInterface
    ): void {
        emitInBatch(listener, {
            message: {
                $case: "playerDetailsUpdatedMessage",
                playerDetailsUpdatedMessage,
            },
        });
    }

    onError(errorMessage: ErrorMessage, listener: ExSocketInterface): void {
        emitInBatch(listener, {
            message: {
                $case: "errorMessage",
                errorMessage,
            },
        });
    }

    // Useless now, will be useful again if we allow editing details in game
    handleSetPlayerDetails(client: ExSocketInterface, playerDetailsMessage: SetPlayerDetailsMessage): void {
        const pusherToBackMessage: PusherToBackMessage["message"] = {
            $case: "setPlayerDetailsMessage",
            setPlayerDetailsMessage: playerDetailsMessage,
        };
        socketManager.forwardMessageToBack(client, pusherToBackMessage);

        if (client.spaceUser.availabilityStatus !== playerDetailsMessage.availabilityStatus) {
            client.spaceUser.availabilityStatus = playerDetailsMessage.availabilityStatus;
            const partialSpaceUser: PartialSpaceUser = PartialSpaceUser.fromPartial({
                availabilityStatus: playerDetailsMessage.availabilityStatus,
                id: client.userId,
            });
            client.spaces.forEach((space) => {
                space.updateUser(partialSpaceUser);
            });
        }
    }

    async handleReportMessage(client: ExSocketInterface, reportPlayerMessage: ReportPlayerMessage): Promise<void> {
        try {
            await adminService.reportPlayer(
                reportPlayerMessage.reportedUserUuid,
                reportPlayerMessage.reportComment,
                client.userUuid,
                client.roomId,
                "en"
            );
        } catch (e) {
            Sentry.captureException(`An error occurred on "handleReportMessage" ${e}`);
            console.error(`An error occurred on "handleReportMessage" ${e}`);
        }
    }

    leaveRoom(socket: ExSocketInterface): void {
        // leave previous room and world
        try {
            if (socket.roomId) {
                try {
                    //user leaves room
                    const room: PusherRoom | undefined = this.rooms.get(socket.roomId);
                    if (room) {
                        debug("Leaving room %s.", socket.roomId);

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
                    clientEventsEmitter.emitClientLeave(socket.userUuid, socket.roomId);
                    debug("User ", socket.name, " left: ", socket.userUuid);
                }
            }
        } finally {
            if (socket.backConnection) {
                socket.backConnection.end();
            }
        }
    }

    leaveSpaces(socket: ExSocketInterface) {
        socket.spacesFilters = new Map<string, SpaceFilterMessage[]>();
        socket.spaces.forEach((space) => {
            space.removeClientWatcher(socket);
            space.removeUser(socket.spaceUser.id);
            this.deleteSpaceIfEmpty(space);
        });
        socket.spaces = [];
    }

    private deleteSpaceIfEmpty(space: Space) {
        if (space.isEmpty()) {
            this.spaces.delete(space.name);
            debug("Space %s is empty. Deleting.", space.name);
            if ([...this.spaces.values()].filter((_space) => _space.backId === space.backId).length === 0) {
                const spaceStreamPusher = this.spaceStreamsToPusher.get(space.backId);
                if (spaceStreamPusher) {
                    spaceStreamPusher.end();
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
        /*const client = this.searchClientByUuid(userUuid);
        if(client) {
            const banUserMessage = new BanUserMessage();
            banUserMessage.setMessage(message);
            banUserMessage.setType(type);
            const pusherToBackMessage = new PusherToBackMessage();
            pusherToBackMessage.setBanusermessage(banUserMessage);
            client.backConnection.write(pusherToBackMessage);
            return;
        }*/

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

    public onUserEnters(user: UserDescriptor, listener: ExSocketInterface): void {
        emitInBatch(listener, {
            message: {
                $case: "userJoinedMessage",
                userJoinedMessage: user.toUserJoinedMessage(),
            },
        });
    }

    public onUserMoves(user: UserDescriptor, listener: ExSocketInterface): void {
        emitInBatch(listener, {
            message: {
                $case: "userMovedMessage",
                userMovedMessage: user.toUserMovedMessage(),
            },
        });
    }

    public onUserLeaves(userId: number, listener: ExSocketInterface): void {
        emitInBatch(listener, {
            message: {
                $case: "userLeftMessage",
                userLeftMessage: {
                    userId,
                },
            },
        });
    }

    public onGroupEnters(group: GroupDescriptor, listener: ExSocketInterface): void {
        emitInBatch(listener, {
            message: {
                $case: "groupUpdateMessage",
                groupUpdateMessage: group.toGroupUpdateMessage(),
            },
        });
    }

    public onGroupMoves(group: GroupDescriptor, listener: ExSocketInterface): void {
        this.onGroupEnters(group, listener);
    }

    public onGroupLeaves(groupId: number, listener: ExSocketInterface): void {
        emitInBatch(listener, {
            message: {
                $case: "groupDeleteMessage",
                groupDeleteMessage: {
                    groupId,
                },
            },
        });
    }

    public emitWorldFullMessage(client: compressors.WebSocket): void {
        if (!client.disconnecting) {
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

    public emitTokenExpiredMessage(client: compressors.WebSocket): void {
        if (!client.disconnecting) {
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
    }

    public emitInvalidTextureMessage(client: compressors.WebSocket): void {
        if (!client.disconnecting) {
            client.send(
                ServerToClientMessage.encode({
                    message: {
                        $case: "invalidTextureMessage",
                        invalidTextureMessage: {},
                    },
                }).finish(),
                true
            );
        }
    }

    public emitConnexionErrorMessage(client: compressors.WebSocket, message: string): void {
        client.send(
            ServerToClientMessage.encode({
                message: {
                    $case: "worldConnexionMessage",
                    worldConnexionMessage: {
                        message,
                    },
                },
            }).finish(),
            true
        );
    }

    public emitErrorScreenMessage(client: compressors.WebSocket, errorApi: ErrorApiData): void {
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

    public async emitPlayGlobalMessage(
        client: ExSocketInterface,
        playGlobalMessageEvent: PlayGlobalMessage
    ): Promise<void> {
        if (!client.tags.includes("admin")) {
            throw new Error("Client is not an admin!");
        }

        const clientRoomUrl = client.roomId;
        let tabUrlRooms: string[];

        if (playGlobalMessageEvent.broadcastToWorld) {
            tabUrlRooms = await adminService.getUrlRoomsFromSameWorld(clientRoomUrl, "en");
        } else {
            tabUrlRooms = [clientRoomUrl];
        }

        for (const roomUrl of tabUrlRooms) {
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

    forwardMessageToBack(client: ExSocketInterface, message: PusherToBackMessage["message"]): void {
        const pusherToBackMessage: PusherToBackMessage = {
            message: message,
        };
        client.backConnection.write(pusherToBackMessage);
    }

    handleBanUserByUuidMessage(client: ExSocketInterface, banUserByUuidMessage: BanUserByUuidMessage): void {
        try {
            adminService
                .banUserByUuid(
                    banUserByUuidMessage.uuidToBan,
                    banUserByUuidMessage.playUri,
                    banUserByUuidMessage.name,
                    banUserByUuidMessage.message,
                    banUserByUuidMessage.byUserEmail
                )
                .then(() => {
                    this.emitBan(
                        banUserByUuidMessage.uuidToBan,
                        banUserByUuidMessage.message,
                        "banned",
                        banUserByUuidMessage.playUri
                    ).catch((err) => {
                        throw err;
                    });
                })
                .catch((err) => {
                    console.info("handleBanUserByUuidMessage => err", err);
                });
        } catch (e) {
            Sentry.captureException(`An error occurred on "handleBanUserByUuidMessage" ${e}`);
            console.error(`An error occurred on "handleBanUserByUuidMessage" ${e}`);
        }
    }

    emitXMPPSettings(client: ExSocketInterface): void {
        const xmppSettings: XmppSettingsMessage = {
            conferenceDomain: "conference." + EJABBERD_DOMAIN,
            rooms: client.mucRooms.map((definition: MucRoomDefinition) => {
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
            jabberId: client.jabberId,
            jabberPassword: client.jabberPassword,
        };

        if (!client.disconnecting) {
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

    handleAddSpaceFilterMessage(client: ExSocketInterface, addSpaceFilterMessage: AddSpaceFilterMessage) {
        const newFilter = addSpaceFilterMessage.spaceFilterMessage;
        if (newFilter) {
            const space = client.spaces.find((space) => space.name === newFilter.spaceName);
            if (space) {
                space.handleAddFilter(client, addSpaceFilterMessage);
                let spacesFilter = client.spacesFilters.get(space.name);
                if (!spacesFilter) {
                    spacesFilter = [newFilter];
                } else {
                    spacesFilter.push(newFilter);
                }
                client.spacesFilters.set(space.name, spacesFilter);
            }
        }
    }

    handleUpdateSpaceFilterMessage(client: ExSocketInterface, updateSpaceFilterMessage: UpdateSpaceFilterMessage) {
        const newFilter = updateSpaceFilterMessage.spaceFilterMessage;
        if (newFilter) {
            const space = client.spaces.find((space) => space.name === newFilter.spaceName);
            if (space) {
                space.handleUpdateFilter(client, updateSpaceFilterMessage);
                const spacesFilter = client.spacesFilters.get(space.name);
                if (spacesFilter) {
                    client.spacesFilters.set(
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

    handleRemoveSpaceFilterMessage(client: ExSocketInterface, removeSpaceFilterMessage: RemoveSpaceFilterMessage) {
        const oldFilter = removeSpaceFilterMessage.spaceFilterMessage;
        if (oldFilter) {
            const space = client.spaces.find((space) => space.name === oldFilter.spaceName);
            if (space) {
                space.handleRemoveFilter(client, removeSpaceFilterMessage);
                const spacesFilter = client.spacesFilters.get(space.name);
                if (spacesFilter) {
                    client.spacesFilters.set(
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

    handleCameraState(client: ExSocketInterface, state: boolean) {
        client.cameraState = state;
        client.spaceUser.cameraState = state;
        const partialSpaceUser: PartialSpaceUser = PartialSpaceUser.fromPartial({
            cameraState: state,
            id: client.userId,
        });
        client.spaces.forEach((space) => {
            space.updateUser(partialSpaceUser);
        });
    }

    handleMicrophoneState(client: ExSocketInterface, state: boolean) {
        client.microphoneState = state;
        client.spaceUser.microphoneState = state;
        const partialSpaceUser: PartialSpaceUser = PartialSpaceUser.fromPartial({
            microphoneState: state,
            id: client.userId,
        });
        client.spaces.forEach((space) => {
            space.updateUser(partialSpaceUser);
        });
    }

    handleMegaphoneState(client: ExSocketInterface, state: boolean) {
        client.megaphoneState = state;
        client.spaceUser.megaphoneState = state;
        const partialSpaceUser: PartialSpaceUser = PartialSpaceUser.fromPartial({
            megaphoneState: state,
            id: client.userId,
        });
        client.spaces.forEach((space) => {
            space.updateUser(partialSpaceUser);
        });
    }

    handleJitsiParticipantIdSpace(client: ExSocketInterface, spaceName: string, jitsiParticipantId: string) {
        const space = client.spaces.find((space) => space.name === spaceName);
        if (space) {
            const partialSpaceUser: PartialSpaceUser = PartialSpaceUser.fromPartial({
                jitsiParticipantId,
                id: client.userId,
            });
            space.updateUser(partialSpaceUser);
        }
    }

    async handleRoomTagsQuery(client: ExSocketInterface, queryMessage: QueryMessage) {
        let tags: string[];
        try {
            tags = await adminService.getTagsList(client.roomId);
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

    handleLeaveSpace(client: ExSocketInterface, spaceName: string) {
        const space = this.spaces.get(spaceName);
        if (space) {
            space.removeClientWatcher(client);
            space.removeUser(client.spaceUser.id);
            client.spaces = client.spaces.filter((space) => space.name !== spaceName);
            this.deleteSpaceIfEmpty(space);
        }
    }
}

export const socketManager = new SocketManager();
