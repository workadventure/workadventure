import Jwt from "jsonwebtoken";
import Debug from "debug";
import {
    AddSpaceFilterMessage,
    AdminMessage,
    AdminPusherToBackMessage,
    AdminRoomMessage,
    BanMessage,
    BanPlayerMessage,
    ChatMembersAnswer,
    ChatMembersQuery,
    EmoteEventMessage,
    ErrorApiData,
    ErrorMessage,
    ErrorScreenMessage,
    FilterType,
    GetMemberAnswer,
    GetMemberQuery,
    JoinRoomMessage,
    MemberData,
    NonUndefinedFields,
    noUndefined,
    OauthRefreshTokenAnswer,
    OauthRefreshTokenQuery,
    PlayerDetailsUpdatedMessage,
    PlayGlobalMessage,
    PrivateEventFrontToPusher,
    PublicEventFrontToPusher,
    PusherToBackMessage,
    QueryMessage,
    RemoveSpaceFilterMessage,
    ReportPlayerMessage,
    RequestFullSyncMessage,
    SearchMemberAnswer,
    SearchMemberQuery,
    SearchTagsAnswer,
    SearchTagsQuery,
    ServerToAdminClientMessage,
    ServerToClientMessage,
    SetPlayerDetailsMessage,
    UpdateSpaceUserMessage,
    UserMovesMessage,
    ViewportMessage,
} from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import axios, { AxiosResponse, isAxiosError } from "axios";
import { WebSocket } from "uWebSockets.js";
import { Deferred } from "ts-deferred";
import { PusherRoom } from "../models/PusherRoom";
import type { SocketData } from "../models/Websocket/SocketData";

import { ProtobufUtils } from "../models/Websocket/ProtobufUtils";
import type { GroupDescriptor, UserDescriptor, ZoneEventListener } from "../models/Zone";
import type { AdminConnection, AdminSocketData } from "../models/Websocket/AdminSocketData";
import { EMBEDDED_DOMAINS_WHITELIST, GRPC_MAX_MESSAGE_SIZE, SECRET_KEY } from "../enums/EnvironmentVariable";
import { Space, SpaceInterface } from "../models/Space";
import { SpaceConnection } from "../models/SpaceConnection";
import { UpgradeFailedData } from "../controllers/IoSocketController";
import { eventProcessor } from "../models/eventProcessorInit";
import { emitInBatch } from "./IoSocketHelpers";
import { clientEventsEmitter } from "./ClientEventsEmitter";
import { gaugeManager } from "./GaugeManager";
import { apiClientRepository } from "./ApiClientRepository";
import { adminService } from "./AdminService";
import { ShortMapDescription } from "./ShortMapDescription";
import { matrixProvider } from "./MatrixProvider";

const debug = Debug("socket");

export type AdminSocket = WebSocket<AdminSocketData>;
export type Socket = WebSocket<SocketData>;
export type SocketUpgradeFailed = WebSocket<UpgradeFailedData>;

export class SocketManager implements ZoneEventListener {
    private rooms: Map<string, PusherRoom> = new Map<string, PusherRoom>();
    private spaces: Map<string, SpaceInterface> = new Map<string, SpaceInterface>();

    constructor(private _spaceConnection = new SpaceConnection()) {
        clientEventsEmitter.registerToClientJoin((clientUUid: string, roomId: string) => {
            gaugeManager.incNbClientPerRoomGauge(roomId);
        });
        clientEventsEmitter.registerToClientLeave((clientUUid: string, roomId: string) => {
            gaugeManager.decNbClientPerRoomGauge(roomId);
        });
        clientEventsEmitter.registerToClientJoinSpace((clientUUid: string, spaceName: string) => {
            gaugeManager.incNbUsersPerSpace(spaceName);
        });
        clientEventsEmitter.registerToClientLeaveSpace((clientUUid: string, spaceName: string) => {
            gaugeManager.decNbUsersPerSpace(spaceName);
        });
        clientEventsEmitter.registerToCreateSpace((spaceName: string) => {
            gaugeManager.incNbSpaces();
        });
        clientEventsEmitter.registerToDeleteSpace((spaceName: string) => {
            gaugeManager.decNbSpaces();
        });
        clientEventsEmitter.registerToSpaceEvent((spaceName: string, eventType: string) => {
            gaugeManager.incSpaceEvents(spaceName, eventType);
        });
        clientEventsEmitter.registerFromWatchSpace((spaceName: string) => {
            gaugeManager.incNbWatchersPerSpace(spaceName);
        });
        clientEventsEmitter.registerFromUnwatchSpace((spaceName: string) => {
            gaugeManager.decNbWatchersPerSpace(spaceName);
        });
    }

    async handleAdminRoom(client: AdminSocket, roomId: string): Promise<void> {
        const apiClient = await apiClientRepository.getClient(roomId, GRPC_MAX_MESSAGE_SIZE);
        const socketData = client.getUserData();
        const adminRoomStream = apiClient.adminRoom();
        if (!socketData.adminConnections) {
            socketData.adminConnections = new Map<string, AdminConnection>();
        }
        if (socketData.adminConnections.has(roomId)) {
            socketData.adminConnections.get(roomId)?.end();
        }
        socketData.adminConnections.set(roomId, adminRoomStream);

        // Event listeners are valid for the lifetime of the connection
        /* eslint-disable listeners/no-missing-remove-event-listener, listeners/no-inline-function-event-listener */
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
                chatID: socketData.chatID,
            };

            debug("Calling joinRoom '" + socketData.roomId + "'");
            const apiClient = await apiClientRepository.getClient(socketData.roomId, GRPC_MAX_MESSAGE_SIZE);
            const streamToBack = apiClient.joinRoom();
            clientEventsEmitter.emitClientJoin(socketData.userUuid, socketData.roomId);

            socketData.backConnection = streamToBack;

            streamToBack
                .on("data", (message: ServerToClientMessage) => {
                    if (!message.message) {
                        console.error("Empty message returned on streamToBack");
                        return;
                    }
                    switch (message.message.$case) {
                        case "roomJoinedMessage": {
                            socketData.userId = message.message.roomJoinedMessage.currentUserId;
                            socketData.spaceUserId =
                                socketData.roomId + "_" + message.message.roomJoinedMessage.currentUserId;

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
            streamToBack.write(pusherToBackMessage);

            const pusherRoom = await this.getOrCreateRoom(socketData.roomId);
            pusherRoom.join(client);
        } catch (e) {
            Sentry.captureException(e);
            console.error(`An error occurred on "join_room" event`, e);
        }
    }

    public handleUpdateSpaceMetadata(client: Socket, spaceName: string, metadata: { [key: string]: unknown }): void {
        try {
            const space = this.spaces.get(spaceName);
            if (!space) {
                throw new Error("Space not found");
            }

            space.forwarder.updateMetadata(metadata);
        } catch (error) {
            Sentry.captureException(error);
            console.error(`An error occurred on "update_space_metadata" event`, error);
        }
    }

    public async handleJoinSpace(
        client: Socket,

        spaceName: string,

        localSpaceName: string,
        filterType: FilterType,
        propertiesToSync: string[]
    ): Promise<void> {
        const socketData = client.getUserData();

        let space: SpaceInterface | undefined = this.spaces.get(spaceName);

        if (!space) {
            const onSpaceEmpty = (space: SpaceInterface) => {
                this.spaces.delete(space.name);
                clientEventsEmitter.emitDeleteSpace(space.name);
            };

            space = new Space(
                spaceName,
                localSpaceName,
                eventProcessor,
                filterType,
                onSpaceEmpty,
                this._spaceConnection,
                propertiesToSync
            );

            this.spaces.set(spaceName, space);
            clientEventsEmitter.emitCreateSpace(spaceName);

            space.initSpace();
        }

        if (space.filterType !== filterType) {
            throw new Error("Error: Space filter type mismatch");
        }

        const deferred = new Deferred<void>();
        socketData.joinSpacesPromise.set(spaceName, deferred);
        try {
            await space.forwarder.registerUser(client, filterType);
            if (socketData.spaces.has(spaceName)) {
                console.error(`User ${socketData.name} is trying to join a space he is already in.`);
                Sentry.captureException(
                    new Error(`User ${socketData.name} is trying to join a space he is already in.`)
                );
            }

            socketData.spaces.add(space.name);
            deferred.resolve();
        } catch (e) {
            deferred.reject(e);
            throw e;
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

    onGroupUsersUpdated(group: GroupDescriptor, listener: Socket): void {
        emitInBatch(listener, {
            message: {
                $case: "groupUsersUpdateMessage",
                groupUsersUpdateMessage: {
                    groupId: group.groupId,
                    userIds: group.userIds,
                },
            },
        });
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
    async handleSetPlayerDetails(client: Socket, playerDetailsMessage: SetPlayerDetailsMessage): Promise<void> {
        const socketData = client.getUserData();
        const pusherToBackMessage: PusherToBackMessage["message"] = {
            $case: "setPlayerDetailsMessage",
            setPlayerDetailsMessage: playerDetailsMessage,
        };

        this.forwardMessageToBack(client, pusherToBackMessage);

        const spacePromises = Array.from(socketData.spaces).map(async (spaceName: string) => {
            const space = this.spaces.get(spaceName);
            if (space) {
                await this.checkClientIsPartOfSpace(client, spaceName);
                const changedFields = space.applyAndGetUpdatedFieldsForUserFromSetPlayerDetails(
                    client,
                    playerDetailsMessage
                );
                if (changedFields) {
                    return space.forwarder.updateUser(changedFields.partialSpaceUser, changedFields.changedFields);
                }
            } else {
                console.error(
                    `User ${socketData.name} thinks he is in space ${spaceName} but this space does not exist anymore.`
                );
                Sentry.captureException(
                    new Error(
                        `User ${socketData.name} thinks he is in space ${spaceName} but this space does not exist anymore.`
                    )
                );
            }
        });

        await Promise.all(spacePromises);
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

    async leaveSpaces(socket: Socket) {
        const socketData = socket.getUserData();

        // Create an array of operations to perform
        const leaveSpacePromises = Array.from(socketData.spaces).map(async (spaceName) => {
            const space = this.spaces.get(spaceName);

            if (space) {
                try {
                    await space.forwarder.unregisterUser(socket);
                    if (space.isEmpty()) {
                        space.cleanup();
                    }

                    socketData.joinSpacesPromise.delete(spaceName);
                    return { space, spaceName, success: true };
                } catch (error) {
                    console.error(`Error unregistering user from space ${spaceName}:`, error);
                    Sentry.captureException(error);
                    return { space, spaceName, success: false };
                }
            } else {
                console.error(
                    `User ${socketData.name} thinks he is in space ${spaceName} but this space does not exist anymore.`
                );
                Sentry.captureException(
                    new Error(
                        `User ${socketData.name} thinks he is in space ${spaceName} but this space does not exist anymore.`
                    )
                );
                return { space: null, spaceName, success: false };
            }
        });

        await Promise.all(leaveSpacePromises);

        socketData.spaces.clear();
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

        const backConnection = await apiClientRepository.getClient(roomId, GRPC_MAX_MESSAGE_SIZE);
        const backAdminMessage: AdminMessage = {
            message,
            roomId,
            recipientUuid: userUuid,
            type,
        };
        backConnection.sendAdminMessage(backAdminMessage, (error: unknown) => {
            if (error !== null) {
                Sentry.captureException(error);
                console.error("Error while sending admin message", error);
            }
        });
    }

    public async emitBan(userUuid: string, message: string, type: string, roomId: string): Promise<void> {
        const backConnection = await apiClientRepository.getClient(roomId, GRPC_MAX_MESSAGE_SIZE);
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
            imageLogo: "",
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
            errorScreenMessage.imageLogo = errorApi.imageLogo;
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
            const shortDescriptions = await adminService.getUrlRoomsFromSameWorld(clientRoomUrl, "en", [], true);
            tabUrlRooms = shortDescriptions.map((shortDescription) => shortDescription.roomUrl);
        } else {
            tabUrlRooms = [clientRoomUrl];
        }

        for (const roomUrl of tabUrlRooms) {
            //eslint-disable-next-line no-await-in-loop
            const apiRoom = await apiClientRepository.getClient(roomUrl, GRPC_MAX_MESSAGE_SIZE);
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

    forwardAdminMessageToBack(client: Socket, message: PusherToBackMessage["message"]): void {
        const socketData = client.getUserData();
        if (!socketData.canEdit) {
            Sentry.captureException(
                new Error(`Security exception, the client tried to update the map: ${JSON.stringify(socketData)}`)
            );
            // Emit error message
            socketData.emitInBatch({
                message: {
                    $case: "errorMessage",
                    errorMessage: {
                        message: "You are not allowed to edit the map",
                    },
                },
            });
            return;
        }
        this.forwardMessageToBack(client, message);
    }

    private async checkClientIsPartOfSpace(client: Socket, spaceName: string): Promise<void> {
        const joinSpacesPromise = client.getUserData().joinSpacesPromise;
        const joinSpaceDeferred = joinSpacesPromise.get(spaceName);
        if (joinSpaceDeferred) {
            await joinSpaceDeferred.promise;
        }

        const socketData = client.getUserData();
        if (!socketData.spaces.has(spaceName)) {
            throw new Error(`Client is trying to do an operation on space ${spaceName} whose he is not part of`);
        }
    }

    async handleAddSpaceFilterMessage(
        client: Socket,
        addSpaceFilterMessage: NonUndefinedFields<AddSpaceFilterMessage>
    ) {
        const newFilter = addSpaceFilterMessage.spaceFilterMessage;

        await this.checkClientIsPartOfSpace(client, newFilter.spaceName);

        const space = this.spaces.get(newFilter.spaceName);
        if (space) {
            space.handleWatch(client);
        } else {
            console.error(`Add space filter called on a space (${newFilter.spaceName}) that does not exist`);
            Sentry.captureException(
                new Error(`Add space filter called on a space (${newFilter.spaceName}) that does not exist`)
            );
        }
    }

    async handleRemoveSpaceFilterMessage(
        client: Socket,
        removeSpaceFilterMessage: NonUndefinedFields<RemoveSpaceFilterMessage>
    ) {
        const oldFilter = removeSpaceFilterMessage.spaceFilterMessage;
        await this.checkClientIsPartOfSpace(client, oldFilter.spaceName);
        const space = this.spaces.get(oldFilter.spaceName);
        if (space) {
            space.handleUnwatch(client);
        } else {
            // This function is called when the userStore of a space in front is unsubscribed.
            // This could happen after we leave the space. Therefore, we don't display an error here.
            // When leaving the space, we take care of removing the filters anyway.
            /*console.error(`Remove space filter called on a space (${oldFilter.spaceName}) that does not exist`);
            Sentry.captureException(
                new Error(`Remove space filter called on a space (${oldFilter.spaceName}) that does not exist`)
            );*/
        }
    }

    async handleUpdateSpaceUser(client: Socket, updateSpaceUserMessage: UpdateSpaceUserMessage) {
        const message = noUndefined(updateSpaceUserMessage);

        await this.checkClientIsPartOfSpace(client, message.spaceName);
        const space = this.spaces.get(message.spaceName);
        if (!space) {
            throw new Error(
                `Could not find space ${message.spaceName} when updating value(s) ${message.updateMask.join(", ")}`
            );
        }

        const updatedSpaceUser = space.applyAndGetUpdatedFieldsForUserFromUpdateSpaceUserMessage(client, message);
        if (updatedSpaceUser) {
            space.forwarder.updateUser(updatedSpaceUser.partialSpaceUser, updatedSpaceUser.changedFields);
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
            roomDescriptions = await adminService.getUrlRoomsFromSameWorld(
                client.getUserData().roomId,
                undefined,
                client.getUserData().tags
            );
            client.send(
                ServerToClientMessage.encode({
                    message: {
                        $case: "answerMessage",
                        answerMessage: {
                            id: queryMessage.id,
                            answer: {
                                $case: "roomsFromSameWorldAnswer",
                                roomsFromSameWorldAnswer: {
                                    roomDescriptions: roomDescriptions.map((room) => ({
                                        ...room,
                                        name: room.name ?? "",
                                        roomUrl: room.roomUrl ?? "",
                                        description: room.description ?? undefined, // Add this line to ensure description is not null
                                        wamUrl: room.wamUrl ?? undefined, // Add this line to ensure wamUrl is not null
                                        copyright: room.copyright ?? undefined, // Add this line to ensure copyright is not null
                                        thumbnail: room.thumbnail ?? undefined, // Add this line to ensure thumbnail is not null
                                        areasSearchable: room.areasSearchable ?? undefined, // Add this line to ensure areasSearchable is not null
                                        entitiesSearchable: room.entitiesSearchable ?? undefined, // Add this line to ensure entitiesSearchable is not null
                                    })),
                                },
                            },
                        },
                    },
                }).finish(),
                true
            );
        } catch (e) {
            console.warn("SocketManager => handleRoomsFromSameWorldQuery => error while getting other rooms list", e);
            try {
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
                // Nothing to do with the error
                Sentry.captureException(e);
                return;
            } catch (e) {
                Sentry.captureException(e);
                console.warn("SocketManager => handleRoomsFromSameWorldQuery => error while sending error message", e);
            }
        }
    }

    async handleLeaveSpace(client: Socket, spaceName: string) {
        const socketData = client.getUserData();
        const space = this.spaces.get(spaceName);
        if (space) {
            await space.forwarder.unregisterUser(client);
            socketData.joinSpacesPromise.delete(space.name);
            const success = socketData.spaces.delete(space.name);
            if (!success) {
                console.error("Could not find space", spaceName, "to leave");
                Sentry.captureException(new Error("Could not find space " + spaceName + " to leave"));
            }
        } else {
            console.error("Could not find space", spaceName, "to leave");
            Sentry.captureException(new Error("Could not find space " + spaceName + " to leave"));
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
                debug(`SocketManager => embeddableUrl : ${url} ${JSON.stringify(error)}`);
                // If the URL is not reachable, we send a message to the client
                // Catch is used to avoid crash if the client is disconnected
                try {
                    emitAnswerMessage(false, false, "URL is not reachable");
                } catch (e) {
                    console.error(e);
                }
            }
        };

        const isAllowed = (response: AxiosResponse) => {
            const headers = response.headers;
            if (!headers) {
                return true;
            }
            let xFrameOption = headers["x-frame-options"];
            if (!xFrameOption) {
                return true;
            }
            xFrameOption = xFrameOption.toLowerCase();

            return xFrameOption !== "deny" && xFrameOption !== "sameorigin";
        };

        await axios
            .head(url, { timeout: 5_000 })
            // Klaxoon
            .then((response) => emitAnswerMessage(true, isAllowed(response)))
            .catch(async (error) => {
                // If response from server is "Method not allowed", we try to do a GET request
                if (isAxiosError(error) && error.response?.status === 405) {
                    await axios
                        .get(url, { timeout: 5_000 })
                        .then((response) => emitAnswerMessage(true, isAllowed(response)))
                        .catch((error) => processError(error));
                } else {
                    processError(error);
                }
            });
    }

    async handleSearchMemberQuery(client: Socket, searchMemberQuery: SearchMemberQuery): Promise<SearchMemberAnswer> {
        const { roomId } = client.getUserData();
        const members = await adminService.searchMembers(roomId, searchMemberQuery.searchText);
        return {
            members: members.map((member: MemberData) => ({
                name: member.name ?? undefined,
                id: member.id,
                email: member.email ?? undefined,
            })),
        };
    }

    async handleSearchTagsQuery(client: Socket, searchTagsQuery: SearchTagsQuery): Promise<SearchTagsAnswer> {
        const { roomId } = client.getUserData();
        const tags = await adminService.searchTags(roomId, searchTagsQuery.searchText);
        return {
            tags,
        };
    }

    async handleGetMemberQuery(getMemberQuery: GetMemberQuery): Promise<GetMemberAnswer> {
        const memberFromApi = await adminService.getMember(getMemberQuery.uuid);
        return {
            member: {
                id: memberFromApi.id,
                name: memberFromApi.name ?? undefined,
                email: memberFromApi.email ?? undefined,
                visitCardUrl: memberFromApi.visitCardUrl ?? undefined,
                chatID: memberFromApi.chatID ?? undefined,
            },
        };
    }

    async handleChatMembersQuery(client: Socket, chatMemberQuery: ChatMembersQuery): Promise<ChatMembersAnswer> {
        const { roomId } = client.getUserData();
        const { total, members } = await adminService.getWorldChatMembers(roomId, chatMemberQuery.searchText);
        return {
            total,
            members,
        };
    }

    handleUpdateChatId(client: Socket, email: string, chatId: string): Promise<void> {
        const userData = client.getUserData();
        userData.chatID = chatId;
        return adminService.updateChatId(email, chatId, client.getUserData().roomId);
    }

    async handleOauthRefreshTokenQuery(
        oauthRefreshTokenQuery: OauthRefreshTokenQuery
    ): Promise<OauthRefreshTokenAnswer> {
        const { token, message } = await adminService.refreshOauthToken(oauthRefreshTokenQuery.tokenToRefresh);
        return { message, token };
    }

    // handle the public event for proximity message
    async handlePublicEvent(client: Socket, publicEvent: PublicEventFrontToPusher) {
        const socketData = client.getUserData();

        await this.checkClientIsPartOfSpace(client, publicEvent.spaceName);
        const space = this.spaces.get(publicEvent.spaceName);
        if (!space) {
            throw new Error(
                `Trying to send a public event to a space that does not exist: "${publicEvent.spaceName}".`
            );
        }
        if (!socketData.userId) {
            throw new Error("User id not found");
        }

        space.forwarder.forwardMessageToSpaceBack({
            $case: "publicEvent",
            publicEvent: {
                ...publicEvent,
                senderUserId: socketData.spaceUserId,
            },
        });
    }

    async handlePrivateEvent(client: Socket, privateEvent: PrivateEventFrontToPusher) {
        const socketData = client.getUserData();

        await this.checkClientIsPartOfSpace(client, privateEvent.spaceName);
        const space = this.spaces.get(privateEvent.spaceName);
        if (!space) {
            throw new Error(
                `Trying to send a private event to a space that does not exist: "${privateEvent.spaceName}"`
            );
        }
        if (!socketData.userId) {
            throw new Error("User id not found");
        }

        space.forwarder.forwardMessageToSpaceBack({
            $case: "privateEvent",
            privateEvent: {
                ...privateEvent,
                senderUserId: socketData.spaceUserId,
            },
        });
    }

    async leaveChatRoomArea(socket: Socket): Promise<void> {
        const { chatID, currentChatRoomArea } = socket.getUserData();

        if (!currentChatRoomArea) {
            return Promise.reject(new Error("currentChatRoomArea is undefined"));
        }

        if (!chatID) {
            console.error("ChatID is undefined");
            return;
        }

        try {
            await Promise.all(
                currentChatRoomArea.map((chatRoomAreaID) => matrixProvider.kickUserFromRoom(chatID, chatRoomAreaID))
            );
        } catch (error) {
            console.error(error);
            Sentry.captureException(error);
        }

        return;
    }

    async handleLeaveChatRoomArea(socket: Socket, chatRoomAreaToLeave: string) {
        const socketData = socket.getUserData();
        socketData.currentChatRoomArea = socketData.currentChatRoomArea.filter(
            (ChatRoomArea) => ChatRoomArea !== chatRoomAreaToLeave
        );

        const chatID = socketData.chatID;

        if (!chatID) {
            console.error("ChatID is undefined");
            return;
        }
        try {
            await matrixProvider.kickUserFromRoom(chatID, chatRoomAreaToLeave);
            return;
        } catch (error) {
            console.error(error);
            return;
        }
    }

    async handleEnterChatRoomAreaQuery(socket: Socket, roomID: string): Promise<void> {
        const socketData = socket.getUserData();
        if (!socketData.chatID) {
            return Promise.reject(new Error("Error: Chat ID not found"));
        }

        socketData.currentChatRoomArea.push(roomID);
        const isAdmin = socketData.tags.includes("admin");

        await matrixProvider.inviteUserToRoom(socketData.chatID, roomID).catch((e) => console.error(e));

        if (isAdmin) {
            await matrixProvider.promoteUserToModerator(socketData.chatID, roomID).catch((e) => console.error(e));
        }
    }

    async handleMapStorageJwtQuery(socket: Socket): Promise<string> {
        const userData = socket.getUserData();

        const mapDetails = await adminService.fetchMapDetails(userData.roomId);

        const wamUrl = !("wamUrl" in mapDetails) ? "" : mapDetails.wamUrl;

        const jwtToken = Jwt.sign({ wamUrl, tags: userData.tags }, SECRET_KEY, {
            expiresIn: "1h",
        });
        return jwtToken;
    }

    async handleRequestFullSync(socket: Socket, requestFullSyncMessage: RequestFullSyncMessage) {
        const socketData = socket.getUserData();

        await this.checkClientIsPartOfSpace(socket, requestFullSyncMessage.spaceName);
        const space = this.spaces.get(requestFullSyncMessage.spaceName);
        if (!space) {
            throw new Error(
                `Trying to send a public event to a space that does not exist: "${requestFullSyncMessage.spaceName}".`
            );
        }

        space.forwarder.forwardMessageToSpaceBack({
            $case: "requestFullSyncMessage",
            requestFullSyncMessage: {
                ...requestFullSyncMessage,
                senderUserId: socketData.spaceUserId,
            },
        });
    }

    deleteSpaceIfEmpty(spaceName: string) {
        const space = this.spaces.get(spaceName);
        if (space && space.isEmpty()) {
            space.cleanup();
        }
    }
}

// Verify that the domain of the url in parameter is in the white list of embeddable domains defined in the .env file (EMBEDDED_DOMAINS_WHITELIST)
const verifyUrlAsDomainInWhiteList = (url: string) => {
    return EMBEDDED_DOMAINS_WHITELIST.some((domain) => url.includes(domain));
};

export const socketManager = new SocketManager();
