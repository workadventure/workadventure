import { PusherRoom } from "../models/PusherRoom";
import type { ExSocketInterface } from "../models/Websocket/ExSocketInterface";

import { ProtobufUtils } from "../models/Websocket/ProtobufUtils";
import { emitInBatch } from "./IoSocketHelpers";
import { clientEventsEmitter } from "./ClientEventsEmitter";
import { gaugeManager } from "./GaugeManager";
import { apiClientRepository } from "./ApiClientRepository";
import type { GroupDescriptor, UserDescriptor } from "../models/Zone";
import type { ZoneEventListener } from "../models/Zone";
import Debug from "debug";
import type { AdminConnection, ExAdminSocketInterface } from "../models/Websocket/ExAdminSocketInterface";
import type { compressors } from "hyper-express";
import { adminService } from "./AdminService";
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
} from "@workadventure/messages";
import { EJABBERD_DOMAIN } from "../enums/EnvironmentVariable";

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
                    console.error(
                        "Error in connection to back server '" +
                            apiClient.getChannel().getTarget() +
                            "' for room '" +
                            client.roomId +
                            "':",
                        err
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
            console.error('An error occurred on "join_room" event');
            console.error(e);
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
                return;
            }
            room.setViewport(client, client.viewport);
        } catch (e) {
            console.error('An error occurred on "SET_VIEWPORT" event');
            console.error(e);
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
            console.error('An error occurred on "handleReportMessage"');
            console.error(e);
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
                console.error("Error while sending admin message", error);
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
            console.error('An error occurred on "handleBanUserByUuidMessage"');
            console.error(e);
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
}

export const socketManager = new SocketManager();
