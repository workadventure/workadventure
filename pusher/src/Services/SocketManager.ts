import { PusherRoom } from "../Model/PusherRoom";
import { CharacterLayer, ExSocketInterface } from "../Model/Websocket/ExSocketInterface";
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
    QueryJitsiJwtMessage,
    RefreshRoomMessage,
    ReportPlayerMessage,
    RoomJoinedMessage,
    SendJitsiJwtMessage,
    ServerToAdminClientMessage,
    ServerToClientMessage,
    SetPlayerDetailsMessage,
    SilentMessage,
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
} from "../Messages/generated/messages_pb";
import { ProtobufUtils } from "../Model/Websocket/ProtobufUtils";
import { ADMIN_API_URL, JITSI_ISS, JITSI_URL, SECRET_JITSI_KEY } from "../Enum/EnvironmentVariable";
import { adminApi } from "./AdminApi";
import { emitInBatch } from "./IoSocketHelpers";
import Jwt from "jsonwebtoken";
import { clientEventsEmitter } from "./ClientEventsEmitter";
import { gaugeManager } from "./GaugeManager";
import { apiClientRepository } from "./ApiClientRepository";
import { GroupDescriptor, UserDescriptor, ZoneEventListener } from "_Model/Zone";
import Debug from "debug";
import { ExAdminSocketInterface } from "_Model/Websocket/ExAdminSocketInterface";
import { WebSocket } from "uWebSockets.js";
import { isRoomRedirect } from "../Messages/JsonMessages/RoomRedirect";
import { CharacterTexture } from "../Messages/JsonMessages/CharacterTexture";

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
                console.warn("Admin connection lost to back server");
                // Let's close the front connection if the back connection is closed. This way, we can retry connecting from the start.
                if (!client.disconnecting) {
                    this.closeWebsocketConnection(client, 1011, "Admin Connection lost to back server");
                }
                console.log("A user left");
            })
            .on("error", (err: Error) => {
                console.error("Error in connection to back server:", err);
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

    leaveAdminRoom(socket: ExAdminSocketInterface) {
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
            joinRoomMessage.setPositionmessage(ProtobufUtils.toPositionMessage(client.position));
            joinRoomMessage.setTagList(client.tags);

            if (client.userRoomToken) {
                joinRoomMessage.setUserroomtoken(client.userRoomToken);
            }

            if (client.visitCardUrl) {
                joinRoomMessage.setVisitcardurl(client.visitCardUrl);
            }
            joinRoomMessage.setCompanion(client.companion);

            for (const characterLayer of client.characterLayers) {
                const characterLayerMessage = new CharacterLayerMessage();
                characterLayerMessage.setName(characterLayer.name);
                if (characterLayer.url !== undefined) {
                    characterLayerMessage.setUrl(characterLayer.url);
                }

                joinRoomMessage.addCharacterlayer(characterLayerMessage);
            }

            console.log("Calling joinRoom");
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
                    console.warn("Connection lost to back server");
                    // Let's close the front connection if the back connection is closed. This way, we can retry connecting from the start.
                    if (!client.disconnecting) {
                        this.closeWebsocketConnection(client, 1011, "Connection lost to back server");
                    }
                    console.log("A user left");
                })
                .on("error", (err: Error) => {
                    console.error("Error in connection to back server:", err);
                    if (!client.disconnecting) {
                        this.closeWebsocketConnection(client, 1011, "Error while connecting to back server");
                    }
                });

            const pusherToBackMessage = new PusherToBackMessage();
            pusherToBackMessage.setJoinroommessage(joinRoomMessage);
            streamToPusher.write(pusherToBackMessage);

            const pusherRoom = await this.getOrCreateRoom(client.roomId);
            pusherRoom.join(client);
        } catch (e) {
            console.error('An error occurred on "join_room" event');
            console.error(e);
        }
    }

    private closeWebsocketConnection(client: ExSocketInterface | ExAdminSocketInterface, code: number, reason: string) {
        client.disconnecting = true;
        //this.leaveRoom(client);
        //client.close();
        client.end(code, reason);
    }

    handleViewport(client: ExSocketInterface, viewport: ViewportMessage.AsObject) {
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

    handleUserMovesMessage(client: ExSocketInterface, userMovesMessage: UserMovesMessage) {
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
    handleSetPlayerDetails(client: ExSocketInterface, playerDetailsMessage: SetPlayerDetailsMessage) {
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setSetplayerdetailsmessage(playerDetailsMessage);

        client.backConnection.write(pusherToBackMessage);
    }

    handleSilentMessage(client: ExSocketInterface, silentMessage: SilentMessage) {
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setSilentmessage(silentMessage);

        client.backConnection.write(pusherToBackMessage);
    }

    handleItemEvent(client: ExSocketInterface, itemEventMessage: ItemEventMessage) {
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setItemeventmessage(itemEventMessage);

        client.backConnection.write(pusherToBackMessage);
    }

    handleVariableEvent(client: ExSocketInterface, variableMessage: VariableMessage) {
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setVariablemessage(variableMessage);

        client.backConnection.write(pusherToBackMessage);
    }

    async handleReportMessage(client: ExSocketInterface, reportPlayerMessage: ReportPlayerMessage) {
        try {
            await adminApi.reportPlayer(
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

    leaveRoom(socket: ExSocketInterface) {
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
                    console.log("A user left");
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
            if (ADMIN_API_URL) {
                await this.updateRoomWithAdminData(room);
            }
            await room.init();
            this.rooms.set(roomUrl, room);
        }
        return room;
    }

    public async updateRoomWithAdminData(room: PusherRoom): Promise<void> {
        const data = await adminApi.fetchMapDetails(room.roomUrl);

        if (isRoomRedirect(data)) {
            // TODO: if the updated room data is actually a redirect, we need to take everybody on the map
            // and redirect everybody to the new location (so we need to close the connection for everybody)
        } else {
            room.tags = data.tags;
            room.policyType = Number(data.policy_type);
        }
    }

    public getWorlds(): Map<string, PusherRoom> {
        return this.rooms;
    }

    public handleQueryJitsiJwtMessage(client: ExSocketInterface, queryJitsiJwtMessage: QueryJitsiJwtMessage) {
        try {
            const room = queryJitsiJwtMessage.getJitsiroom();
            const tag = queryJitsiJwtMessage.getTag(); // FIXME: this is not secure. We should load the JSON for the current room and check rights associated to room instead.

            if (SECRET_JITSI_KEY === "") {
                throw new Error(
                    "You must set the SECRET_JITSI_KEY key to the secret to generate JWT tokens for Jitsi."
                );
            }

            // Let's see if the current client has
            const isAdmin = client.tags.includes(tag);

            const jwt = Jwt.sign(
                {
                    aud: "jitsi",
                    iss: JITSI_ISS,
                    sub: JITSI_URL,
                    room: room,
                    moderator: isAdmin,
                },
                SECRET_JITSI_KEY,
                {
                    expiresIn: "1d",
                    algorithm: "HS256",
                    header: {
                        alg: "HS256",
                        typ: "JWT",
                    },
                }
            );

            const sendJitsiJwtMessage = new SendJitsiJwtMessage();
            sendJitsiJwtMessage.setJitsiroom(room);
            sendJitsiJwtMessage.setJwt(jwt);

            const serverToClientMessage = new ServerToClientMessage();
            serverToClientMessage.setSendjitsijwtmessage(sendJitsiJwtMessage);

            client.send(serverToClientMessage.serializeBinary().buffer, true);
        } catch (e) {
            console.error("An error occurred while generating the Jitsi JWT token: ", e);
        }
    }

    public async emitSendUserMessage(userUuid: string, message: string, type: string, roomId: string) {
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

    public async emitBan(userUuid: string, message: string, type: string, roomId: string) {
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

    /**
     * Merges the characterLayers received from the front (as an array of string) with the custom textures from the back.
     */
    static mergeCharacterLayersAndCustomTextures(
        characterLayers: string[],
        memberTextures: CharacterTexture[]
    ): CharacterLayer[] {
        const characterLayerObjs: CharacterLayer[] = [];
        for (const characterLayer of characterLayers) {
            if (characterLayer.startsWith("customCharacterTexture")) {
                const customCharacterLayerId: number = +characterLayer.substr(22);
                for (const memberTexture of memberTextures) {
                    if (memberTexture.id == customCharacterLayerId) {
                        characterLayerObjs.push({
                            name: characterLayer,
                            url: memberTexture.url,
                        });
                        break;
                    }
                }
            } else {
                characterLayerObjs.push({
                    name: characterLayer,
                    url: undefined,
                });
            }
        }
        return characterLayerObjs;
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

    public emitWorldFullMessage(client: WebSocket) {
        const errorMessage = new WorldFullMessage();

        const serverToClientMessage = new ServerToClientMessage();
        serverToClientMessage.setWorldfullmessage(errorMessage);

        if (!client.disconnecting) {
            client.send(serverToClientMessage.serializeBinary().buffer, true);
        }
    }

    public emitTokenExpiredMessage(client: WebSocket) {
        const errorMessage = new TokenExpiredMessage();

        const serverToClientMessage = new ServerToClientMessage();
        serverToClientMessage.setTokenexpiredmessage(errorMessage);

        if (!client.disconnecting) {
            client.send(serverToClientMessage.serializeBinary().buffer, true);
        }
    }

    public emitConnexionErrorMessage(client: WebSocket, message: string) {
        const errorMessage = new WorldConnexionMessage();
        errorMessage.setMessage(message);

        const serverToClientMessage = new ServerToClientMessage();
        serverToClientMessage.setWorldconnexionmessage(errorMessage);

        client.send(serverToClientMessage.serializeBinary().buffer, true);
    }

    private refreshRoomData(roomId: string, versionNumber: number): void {
        const room = this.rooms.get(roomId);
        //this function is run for every users connected to the room, so we need to make sure the room wasn't already refreshed.
        if (!room || !room.needsUpdate(versionNumber)) return;

        this.updateRoomWithAdminData(room);
    }

    handleEmotePromptMessage(client: ExSocketInterface, emoteEventmessage: EmotePromptMessage) {
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
            tabUrlRooms = await adminApi.getUrlRoomsFromSameWorld(clientRoomUrl);
        } else {
            tabUrlRooms = [clientRoomUrl];
        }

        const roomMessage = new AdminRoomMessage();
        roomMessage.setMessage(playGlobalMessageEvent.getContent());
        roomMessage.setType(playGlobalMessageEvent.getType());

        for (const roomUrl of tabUrlRooms) {
            const apiRoom = await apiClientRepository.getClient(roomUrl);
            roomMessage.setRoomid(roomUrl);
            apiRoom.sendAdminMessageToRoom(roomMessage, (response) => {
                return;
            });
        }
    }
}

export const socketManager = new SocketManager();
