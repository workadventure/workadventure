import { PusherRoom } from "../Model/PusherRoom";
import { ExSocketInterface } from "../Model/Websocket/ExSocketInterface";
import {
    AdminMessage,
    AdminPusherToBackMessage,
    AdminRoomMessage,
    BanMessage,
    CharacterLayerMessage,
    EmoteEventMessage,
    EmotePromptMessage,
    FollowRequestMessage,
    FollowConfirmationMessage,
    FollowAbortMessage,
    GroupDeleteMessage,
    ItemEventMessage,
    JoinRoomMessage,
    PlayGlobalMessage,
    PusherToBackMessage,
    RefreshRoomMessage,
    ReportPlayerMessage,
    RoomJoinedMessage,
    ServerToAdminClientMessage,
    ServerToClientMessage,
    SetPlayerDetailsMessage,
    SubMessage,
    UserJoinedRoomMessage,
    UserLeftMessage,
    UserLeftRoomMessage,
    UserMovesMessage,
    ViewportMessage,
    WebRtcSignalToServerMessage,
    WorldConnexionMessage,
    TokenExpiredMessage,
    VariableMessage,
    ErrorMessage,
    WorldFullMessage,
    PlayerDetailsUpdatedMessage,
    LockGroupPromptMessage,
    InvalidTextureMessage,
    ErrorScreenMessage,
    QueryMessage,
    XmppMessage,
    AskPositionMessage,
    EditMapMessage,
    BanUserByUuidMessage,
} from "../Messages/generated/messages_pb";
import { ProtobufUtils } from "../Model/Websocket/ProtobufUtils";
import { emitInBatch } from "./IoSocketHelpers";
import { clientEventsEmitter } from "./ClientEventsEmitter";
import { gaugeManager } from "./GaugeManager";
import { apiClientRepository } from "./ApiClientRepository";
import { GroupDescriptor, UserDescriptor, ZoneEventListener } from "../Model/Zone";
import Debug from "debug";
import { ExAdminSocketInterface } from "../Model/Websocket/ExAdminSocketInterface";
import { compressors } from "hyper-express";
import { adminService } from "./AdminService";
import { ErrorApiData } from "../Messages/JsonMessages/ErrorApiData";
import { BoolValue, Int32Value, StringValue } from "google-protobuf/google/protobuf/wrappers_pb";

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
        client.adminConnection = adminRoomStream;

        adminRoomStream
            .on("data", (message: ServerToAdminClientMessage) => {
                if (message.hasUserjoinedroom()) {
                    const userJoinedRoomMessage = message.getUserjoinedroom() as UserJoinedRoomMessage;
                    if (!client.disconnecting) {
                        client.send(
                            JSON.stringify({
                                type: "MemberJoin",
                                data: {
                                    uuid: userJoinedRoomMessage.getUuid(),
                                    name: userJoinedRoomMessage.getName(),
                                    ipAddress: userJoinedRoomMessage.getIpaddress(),
                                    roomId: roomId,
                                },
                            })
                        );
                    }
                } else if (message.hasUserleftroom()) {
                    const userLeftRoomMessage = message.getUserleftroom() as UserLeftRoomMessage;
                    if (!client.disconnecting) {
                        client.send(
                            JSON.stringify({
                                type: "MemberLeave",
                                data: {
                                    uuid: userLeftRoomMessage.getUuid(),
                                },
                            })
                        );
                    }
                } else {
                    throw new Error("Unexpected admin message");
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

        const message = new AdminPusherToBackMessage();
        message.setSubscribetoroom(roomId);

        console.log(
            `Admin socket handle room ${roomId} connections for a client on ${Buffer.from(
                client.getRemoteAddressAsText()
            ).toString()}`
        );

        adminRoomStream.write(message);
    }

    leaveAdminRoom(socket: ExAdminSocketInterface): void {
        if (socket.adminConnection) {
            socket.adminConnection.end();
        }
    }

    async handleJoinRoom(client: ExSocketInterface): Promise<void> {
        const viewport = client.viewport;
        try {
            const joinRoomMessage = new JoinRoomMessage();
            joinRoomMessage.setUseruuid(client.userUuid);
            joinRoomMessage.setIpaddress(client.IPAddress);
            joinRoomMessage.setRoomid(client.roomId);
            joinRoomMessage.setName(client.name);
            joinRoomMessage.setAvailabilitystatus(client.availabilityStatus);
            joinRoomMessage.setPositionmessage(ProtobufUtils.toPositionMessage(client.position));
            joinRoomMessage.setTagList(client.tags);
            joinRoomMessage.setIslogged(client.isLogged);

            if (client.userRoomToken) {
                joinRoomMessage.setUserroomtoken(client.userRoomToken);
            }

            if (client.visitCardUrl) {
                joinRoomMessage.setVisitcardurl(client.visitCardUrl);
            }
            joinRoomMessage.setCompanion(client.companion);
            joinRoomMessage.setActivatedinviteuser(
                client.activatedInviteUser != undefined ? client.activatedInviteUser : true
            );

            for (const characterLayer of client.characterLayers) {
                const characterLayerMessage = new CharacterLayerMessage();
                characterLayerMessage.setName(characterLayer.id);
                if (characterLayer.url !== undefined) {
                    characterLayerMessage.setUrl(characterLayer.url);
                }
                if (characterLayer.layer !== undefined) {
                    characterLayerMessage.setLayer(characterLayer.layer);
                }

                joinRoomMessage.addCharacterlayer(characterLayerMessage);
            }

            debug("Calling joinRoom '" + client.roomId + "'");
            const apiClient = await apiClientRepository.getClient(client.roomId);
            const streamToPusher = apiClient.joinRoom();
            clientEventsEmitter.emitClientJoin(client.userUuid, client.roomId);

            client.backConnection = streamToPusher;

            streamToPusher
                .on("data", (message: ServerToClientMessage) => {
                    if (message.hasRoomjoinedmessage()) {
                        client.userId = (message.getRoomjoinedmessage() as RoomJoinedMessage).getCurrentuserid();

                        // If this is the first message sent, send back the viewport.
                        this.handleViewport(client, viewport);
                    }

                    if (message.hasRefreshroommessage()) {
                        const refreshMessage: RefreshRoomMessage =
                            message.getRefreshroommessage() as unknown as RefreshRoomMessage;
                        this.refreshRoomData(refreshMessage.getRoomid(), refreshMessage.getVersionnumber());
                    }

                    // Let's pass data over from the back to the client.
                    if (!client.disconnecting) {
                        client.send(message.serializeBinary().buffer, true);
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
                    if (client.xmppClient) {
                        console.log("Trying disconnecting from xmppClient");
                        client.xmppClient.close();
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

            const pusherToBackMessage = new PusherToBackMessage();
            pusherToBackMessage.setJoinroommessage(joinRoomMessage);
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

    handleViewport(client: ExSocketInterface, viewport: ViewportMessage.AsObject): void {
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
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setUsermovesmessage(userMovesMessage);

        client.backConnection.write(pusherToBackMessage);

        const viewport = userMovesMessage.getViewport();
        if (viewport === undefined) {
            throw new Error("Missing viewport in UserMovesMessage");
        }

        // Now, we need to listen to the correct viewport.
        this.handleViewport(client, viewport.toObject());
    }

    handleFollowRequest(client: ExSocketInterface, message: FollowRequestMessage): void {
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setFollowrequestmessage(message);
        client.backConnection.write(pusherToBackMessage);
    }

    handleFollowConfirmation(client: ExSocketInterface, message: FollowConfirmationMessage): void {
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setFollowconfirmationmessage(message);
        client.backConnection.write(pusherToBackMessage);
    }

    handleFollowAbort(client: ExSocketInterface, message: FollowAbortMessage): void {
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setFollowabortmessage(message);
        client.backConnection.write(pusherToBackMessage);
    }

    handleLockGroup(client: ExSocketInterface, message: LockGroupPromptMessage): void {
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setLockgrouppromptmessage(message);
        client.backConnection.write(pusherToBackMessage);
    }

    handleEditMapMessage(client: ExSocketInterface, message: EditMapMessage): void {
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setEditmapmessage(message);
        client.backConnection.write(pusherToBackMessage);
    }

    onEmote(emoteMessage: EmoteEventMessage, listener: ExSocketInterface): void {
        const subMessage = new SubMessage();
        subMessage.setEmoteeventmessage(emoteMessage);

        emitInBatch(listener, subMessage);
    }

    onPlayerDetailsUpdated(
        playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage,
        listener: ExSocketInterface
    ): void {
        const subMessage = new SubMessage();
        subMessage.setPlayerdetailsupdatedmessage(playerDetailsUpdatedMessage);

        emitInBatch(listener, subMessage);
    }

    onError(errorMessage: ErrorMessage, listener: ExSocketInterface): void {
        const subMessage = new SubMessage();
        subMessage.setErrormessage(errorMessage);

        emitInBatch(listener, subMessage);
    }

    // Useless now, will be useful again if we allow editing details in game
    handleSetPlayerDetails(client: ExSocketInterface, playerDetailsMessage: SetPlayerDetailsMessage): void {
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setSetplayerdetailsmessage(playerDetailsMessage);

        client.backConnection.write(pusherToBackMessage);
    }

    handleItemEvent(client: ExSocketInterface, itemEventMessage: ItemEventMessage): void {
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setItemeventmessage(itemEventMessage);

        client.backConnection.write(pusherToBackMessage);
    }

    handleVariableEvent(client: ExSocketInterface, variableMessage: VariableMessage): void {
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setVariablemessage(variableMessage);

        client.backConnection.write(pusherToBackMessage);
    }

    async handleReportMessage(client: ExSocketInterface, reportPlayerMessage: ReportPlayerMessage): Promise<void> {
        try {
            await adminService.reportPlayer(
                "en",
                reportPlayerMessage.getReporteduseruuid(),
                reportPlayerMessage.getReportcomment(),
                client.userUuid,
                client.roomId
            );
        } catch (e) {
            console.error('An error occurred on "handleReportMessage"');
            console.error(e);
        }
    }

    emitVideo(socket: ExSocketInterface, data: WebRtcSignalToServerMessage): void {
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setWebrtcsignaltoservermessage(data);

        socket.backConnection.write(pusherToBackMessage);
    }

    emitScreenSharing(socket: ExSocketInterface, data: WebRtcSignalToServerMessage): void {
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setWebrtcscreensharingsignaltoservermessage(data);

        socket.backConnection.write(pusherToBackMessage);
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
                    if (socket.xmppClient) {
                        console.log("leaveRoom => close");
                        socket.xmppClient.close();
                    }
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

    public handleQueryMessage(client: ExSocketInterface, queryMessage: QueryMessage): void {
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setQuerymessage(queryMessage);

        client.backConnection.write(pusherToBackMessage);
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
        const backAdminMessage = new AdminMessage();
        backAdminMessage.setMessage(message);
        backAdminMessage.setRoomid(roomId);
        backAdminMessage.setRecipientuuid(userUuid);
        backAdminMessage.setType(type);
        backConnection.sendAdminMessage(backAdminMessage, (error) => {
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
        const banMessage = new BanMessage();
        banMessage.setMessage(message);
        banMessage.setRoomid(roomId);
        banMessage.setRecipientuuid(userUuid);
        banMessage.setType(type);
        backConnection.ban(banMessage, (error) => {
            if (error !== null) {
                console.error("Error while sending admin message", error);
            }
        });
    }

    public onUserEnters(user: UserDescriptor, listener: ExSocketInterface): void {
        const subMessage = new SubMessage();
        subMessage.setUserjoinedmessage(user.toUserJoinedMessage());

        emitInBatch(listener, subMessage);
    }

    public onUserMoves(user: UserDescriptor, listener: ExSocketInterface): void {
        const subMessage = new SubMessage();
        subMessage.setUsermovedmessage(user.toUserMovedMessage());

        emitInBatch(listener, subMessage);
    }

    public onUserLeaves(userId: number, listener: ExSocketInterface): void {
        const userLeftMessage = new UserLeftMessage();
        userLeftMessage.setUserid(userId);

        const subMessage = new SubMessage();
        subMessage.setUserleftmessage(userLeftMessage);

        emitInBatch(listener, subMessage);
    }

    public onGroupEnters(group: GroupDescriptor, listener: ExSocketInterface): void {
        const subMessage = new SubMessage();
        subMessage.setGroupupdatemessage(group.toGroupUpdateMessage());

        emitInBatch(listener, subMessage);
    }

    public onGroupMoves(group: GroupDescriptor, listener: ExSocketInterface): void {
        this.onGroupEnters(group, listener);
    }

    public onGroupLeaves(groupId: number, listener: ExSocketInterface): void {
        const groupDeleteMessage = new GroupDeleteMessage();
        groupDeleteMessage.setGroupid(groupId);

        const subMessage = new SubMessage();
        subMessage.setGroupdeletemessage(groupDeleteMessage);

        emitInBatch(listener, subMessage);
    }

    public emitWorldFullMessage(client: compressors.WebSocket): void {
        const errorMessage = new WorldFullMessage();

        const serverToClientMessage = new ServerToClientMessage();
        serverToClientMessage.setWorldfullmessage(errorMessage);

        if (!client.disconnecting) {
            client.send(serverToClientMessage.serializeBinary().buffer, true);
        }
    }

    public emitTokenExpiredMessage(client: compressors.WebSocket): void {
        const errorMessage = new TokenExpiredMessage();

        const serverToClientMessage = new ServerToClientMessage();
        serverToClientMessage.setTokenexpiredmessage(errorMessage);

        if (!client.disconnecting) {
            client.send(serverToClientMessage.serializeBinary().buffer, true);
        }
    }

    public emitInvalidTextureMessage(client: compressors.WebSocket): void {
        const errorMessage = new InvalidTextureMessage();

        const serverToClientMessage = new ServerToClientMessage();
        serverToClientMessage.setInvalidtexturemessage(errorMessage);

        if (!client.disconnecting) {
            client.send(serverToClientMessage.serializeBinary().buffer, true);
        }
    }

    public emitConnexionErrorMessage(client: compressors.WebSocket, message: string): void {
        const errorMessage = new WorldConnexionMessage();
        errorMessage.setMessage(message);

        const serverToClientMessage = new ServerToClientMessage();
        serverToClientMessage.setWorldconnexionmessage(errorMessage);

        client.send(serverToClientMessage.serializeBinary().buffer, true);
    }

    public emitErrorScreenMessage(client: compressors.WebSocket, errorApi: ErrorApiData): void {
        const errorMessage = new ErrorScreenMessage();
        errorMessage.setType(errorApi.type);
        if (errorApi.type == "retry" || errorApi.type == "error" || errorApi.type == "unauthorized") {
            errorMessage.setCode(new StringValue().setValue(errorApi.code));
            errorMessage.setTitle(new StringValue().setValue(errorApi.title));
            errorMessage.setSubtitle(new StringValue().setValue(errorApi.subtitle));
            errorMessage.setDetails(new StringValue().setValue(errorApi.details));
            errorMessage.setImage(new StringValue().setValue(errorApi.image));
            if (errorApi.type == "unauthorized" && errorApi.buttonTitle)
                errorMessage.setButtontitle(new StringValue().setValue(errorApi.buttonTitle));
        }
        if (errorApi.type == "retry") {
            if (errorApi.buttonTitle) errorMessage.setButtontitle(new StringValue().setValue(errorApi.buttonTitle));
            if (errorApi.canRetryManual !== undefined)
                errorMessage.setCanretrymanual(new BoolValue().setValue(errorApi.canRetryManual));
            if (errorApi.timeToRetry)
                errorMessage.setTimetoretry(new Int32Value().setValue(Number(errorApi.timeToRetry)));
        }
        if (errorApi.type == "redirect" && errorApi.urlToRedirect)
            errorMessage.setUrltoredirect(new StringValue().setValue(errorApi.urlToRedirect));

        const serverToClientMessage = new ServerToClientMessage();
        serverToClientMessage.setErrorscreenmessage(errorMessage);

        //if (!client.disconnecting) {
        client.send(serverToClientMessage.serializeBinary().buffer, true);
        //}
    }

    private refreshRoomData(roomId: string, versionNumber: number): void {
        const room = this.rooms.get(roomId);
        //this function is run for every users connected to the room, so we need to make sure the room wasn't already refreshed.
        if (!room || !room.needsUpdate(versionNumber)) return;
        //TODO check right of user in admin
    }

    handleEmotePromptMessage(client: ExSocketInterface, emoteEventmessage: EmotePromptMessage): void {
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setEmotepromptmessage(emoteEventmessage);

        client.backConnection.write(pusherToBackMessage);
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

        if (playGlobalMessageEvent.getBroadcasttoworld()) {
            tabUrlRooms = await adminService.getUrlRoomsFromSameWorld(clientRoomUrl, "en");
        } else {
            tabUrlRooms = [clientRoomUrl];
        }

        const roomMessage = new AdminRoomMessage();
        roomMessage.setMessage(playGlobalMessageEvent.getContent());
        roomMessage.setType(playGlobalMessageEvent.getType());

        for (const roomUrl of tabUrlRooms) {
            const apiRoom = await apiClientRepository.getClient(roomUrl);
            roomMessage.setRoomid(roomUrl);
            apiRoom.sendAdminMessageToRoom(roomMessage, () => {
                return;
            });
        }
    }

    handleXmppMessage(client: ExSocketInterface, xmppMessage: XmppMessage): void {
        if (client.xmppClient === undefined) {
            throw new Error(
                "Trying to send a message from client to server but the XMPP connection is not established yet! There is a race condition."
            );
        }
        client.xmppClient.send(xmppMessage.getStanza()).catch((e) => console.error(e));
        console.log("XMPP Message sent");
    }

    handleAskPositionMessage(client: ExSocketInterface, askPositionMessage: AskPositionMessage): void {
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setAskpositionmessage(askPositionMessage);

        client.backConnection.write(pusherToBackMessage);
    }

    handleBanUserByUuidMessage(client: ExSocketInterface, banUserByUuidMessage: BanUserByUuidMessage): void {
        try {
            adminService
                .banUserByUuid(
                    banUserByUuidMessage.getUuidtoban(),
                    banUserByUuidMessage.getPlayuri(),
                    banUserByUuidMessage.getName(),
                    banUserByUuidMessage.getMessage(),
                    banUserByUuidMessage.getByuseremail()
                )
                .then(() => {
                    this.emitBan(
                        banUserByUuidMessage.getUuidtoban(),
                        banUserByUuidMessage.getMessage(),
                        "banned",
                        banUserByUuidMessage.getPlayuri()
                    );
                });
        } catch (e) {
            console.error('An error occurred on "handleBanUserByUuidMessage"');
            console.error(e);
        }
    }
}

export const socketManager = new SocketManager();
