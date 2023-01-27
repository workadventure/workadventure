import { GameRoom } from "../Model/GameRoom";
import {
    AnswerMessage,
    BanUserMessage,
    BatchToPusherMessage,
    BatchToPusherRoomMessage,
    EmoteEventMessage,
    EmotePromptMessage,
    ErrorMessage,
    FollowAbortMessage,
    FollowConfirmationMessage,
    FollowRequestMessage,
    GroupLeftZoneMessage,
    GroupUpdateZoneMessage,
    GroupUsersUpdateMessage,
    ItemEventMessage,
    ItemStateMessage,
    JitsiJwtAnswer,
    JitsiJwtQuery,
    JoinBBBMeetingAnswer,
    JoinBBBMeetingQuery,
    JoinRoomMessage,
    LockGroupPromptMessage,
    PlayerDetailsUpdatedMessage,
    PointMessage,
    QueryMessage,
    RefreshRoomMessage,
    RoomDescription,
    RoomJoinedMessage,
    RoomsList,
    SendUserMessage,
    ServerToClientMessage,
    SetPlayerDetailsMessage,
    SubMessage,
    SubToPusherMessage,
    UserJoinedZoneMessage,
    UserLeftZoneMessage,
    UserMovedMessage,
    UserMovesMessage,
    VariableMessage,
    WebRtcDisconnectMessage,
    WebRtcSignalToClientMessage,
    WebRtcSignalToServerMessage,
    WebRtcStartMessage,
    WorldFullWarningMessage,
    Zone as ProtoZone,
    AskPositionMessage,
    MoveToPositionMessage,
    SubToPusherRoomMessage,
    EditMapCommandWithKeyMessage,
    EditMapCommandMessage,
    ChatMessagePrompt,
    UpdateMapToNewestWithKeyMessage,
    EditMapCommandsArrayMessage,
    UpdateMapToNewestMessage,
} from "../Messages/generated/messages_pb";
import { User, UserSocket } from "../Model/User";
import { ProtobufUtils } from "../Model/Websocket/ProtobufUtils";
import { Group } from "../Model/Group";
import { cpuTracker } from "./CpuTracker";
import { GROUP_RADIUS, MINIMUM_DISTANCE, TURN_STATIC_AUTH_SECRET } from "../Enum/EnvironmentVariable";
import { Movable } from "../Model/Movable";
import { PositionInterface } from "../Model/PositionInterface";
import Jwt from "jsonwebtoken";
import BigbluebuttonJs from "bigbluebutton-js";
import { clientEventsEmitter } from "./ClientEventsEmitter";
import { gaugeManager } from "./GaugeManager";
import { RoomSocket, ZoneSocket } from "../RoomManager";
import { Zone } from "../Model/Zone";
import Debug from "debug";
import { Admin } from "../Model/Admin";
import crypto from "crypto";
import QueryCase = QueryMessage.QueryCase;
import { getMapStorageClient } from "./MapStorageClient";
import { emitError } from "./MessageHelpers";

const debug = Debug("sockermanager");

function emitZoneMessage(subMessage: SubToPusherMessage, socket: ZoneSocket): void {
    // TODO: should we batch those every 100ms?
    const batchMessage = new BatchToPusherMessage();
    batchMessage.addPayload(subMessage);
    socket.write(batchMessage);
}

export class SocketManager {
    /**
     * List of rooms already loaded (note: never use this directly).
     * It is only here for the very specific getAllRooms case that needs to return all available rooms
     * without waiting for pending rooms.
     */
    private resolvedRooms = new Map<string, GameRoom>();
    // List of rooms (or rooms in process of loading).
    private roomsPromises = new Map<string, PromiseLike<GameRoom>>();

    constructor() {
        clientEventsEmitter.registerToClientJoin((clientUUid: string, roomId: string) => {
            gaugeManager.incNbClientPerRoomGauge(roomId);
        });
        clientEventsEmitter.registerToClientLeave((clientUUid: string, roomId: string) => {
            gaugeManager.decNbClientPerRoomGauge(roomId);
        });
    }

    public async handleJoinRoom(
        socket: UserSocket,
        joinRoomMessage: JoinRoomMessage
    ): Promise<{ room: GameRoom; user: User }> {
        //join new previous room
        const { room, user } = await this.joinRoom(socket, joinRoomMessage);

        const lastCommandId = joinRoomMessage.getLastcommandid();
        let commandsToApply: EditMapCommandMessage[] | undefined = undefined;

        if (lastCommandId) {
            const updateMapToNewestMessage = new UpdateMapToNewestMessage();
            updateMapToNewestMessage.setCommandid(lastCommandId);

            const updateMapToNewestWithKeyMessage = new UpdateMapToNewestWithKeyMessage();
            updateMapToNewestWithKeyMessage.setMapkey(room.mapUrl);
            updateMapToNewestWithKeyMessage.setUpdatemaptonewestmessage(updateMapToNewestMessage);

            commandsToApply = await new Promise<EditMapCommandMessage[]>((resolve, reject) => {
                getMapStorageClient().handleUpdateMapToNewestMessage(
                    updateMapToNewestWithKeyMessage,
                    (err: unknown, message: EditMapCommandsArrayMessage) => {
                        if (err) {
                            emitError(user.socket, err);
                            reject(err);
                            return;
                        }
                        resolve(message.getEditmapcommandsList());
                    }
                );
            });
        }

        if (!socket.writable) {
            console.warn("Socket was aborted");
            return {
                room,
                user,
            };
        }
        const roomJoinedMessage = new RoomJoinedMessage();
        roomJoinedMessage.setUserjid(joinRoomMessage.getUserjid());
        roomJoinedMessage.setTagList(joinRoomMessage.getTagList());
        roomJoinedMessage.setUserroomtoken(joinRoomMessage.getUserroomtoken());
        roomJoinedMessage.setCharacterlayerList(joinRoomMessage.getCharacterlayerList());
        if (commandsToApply) {
            const editMapCommandsArrayMessage = new EditMapCommandsArrayMessage();
            editMapCommandsArrayMessage.setEditmapcommandsList(commandsToApply);
            roomJoinedMessage.setEditmapcommandsarraymessage(editMapCommandsArrayMessage);
        }

        for (const [itemId, item] of room.getItemsState().entries()) {
            const itemStateMessage = new ItemStateMessage();
            itemStateMessage.setItemid(itemId);
            itemStateMessage.setStatejson(JSON.stringify(item));

            roomJoinedMessage.addItem(itemStateMessage);
        }

        const variables = await room.getVariablesForTags(user.tags);

        for (const [name, value] of variables.entries()) {
            const variableMessage = new VariableMessage();
            variableMessage.setName(name);
            variableMessage.setValue(value);

            roomJoinedMessage.addVariable(variableMessage);
        }

        roomJoinedMessage.setCurrentuserid(user.id);
        roomJoinedMessage.setActivatedinviteuser(
            user.activatedInviteUser != undefined ? user.activatedInviteUser : true
        );
        if (user.applications != undefined) {
            roomJoinedMessage.setApplicationsList(user.applications);
        }

        const playerVariables = user.getVariables().getVariables();

        for (const [name, value] of playerVariables.entries()) {
            const variableMessage = new VariableMessage();
            variableMessage.setName(name);
            variableMessage.setValue(value.value);

            roomJoinedMessage.addPlayervariable(variableMessage);
        }

        const serverToClientMessage = new ServerToClientMessage();
        serverToClientMessage.setRoomjoinedmessage(roomJoinedMessage);
        socket.write(serverToClientMessage);

        return {
            room,
            user,
        };
    }

    handleUserMovesMessage(room: GameRoom, user: User, userMovesMessage: UserMovesMessage) {
        const userMoves = userMovesMessage.toObject();
        const position = userMovesMessage.getPosition();

        // If CPU is high, let's drop messages of users moving (we will only dispatch the final position)
        if (cpuTracker.isOverHeating() && userMoves.position?.moving === true) {
            return;
        }

        if (position === undefined) {
            throw new Error("Position not found in message");
        }
        const viewport = userMoves.viewport;
        if (viewport === undefined) {
            throw new Error("Viewport not found in message");
        }

        // update position in the world
        room.updatePosition(user, ProtobufUtils.toPointInterface(position));
        //room.setViewport(client, client.viewport);
    }

    handleSetPlayerDetails(room: GameRoom, user: User, playerDetailsMessage: SetPlayerDetailsMessage) {
        room.updatePlayerDetails(user, playerDetailsMessage);
    }

    handleItemEvent(room: GameRoom, user: User, itemEventMessage: ItemEventMessage) {
        const itemEvent = ProtobufUtils.toItemEvent(itemEventMessage);

        const subMessage = new SubMessage();
        subMessage.setItemeventmessage(itemEventMessage);

        // Let's send the event without using the SocketIO room.
        // TODO: move this in the GameRoom class.
        for (const user of room.getUsers().values()) {
            user.emitInBatch(subMessage);
        }

        room.setItemState(itemEvent.itemId, itemEvent.state);
    }

    handleVariableEvent(room: GameRoom, user: User, variableMessage: VariableMessage): Promise<void> {
        return room.setVariable(variableMessage.getName(), variableMessage.getValue(), user);
    }

    // handleSharedPlayerVariableEvent(room: GameRoom, user: User, variableMessage: VariableMessage): Promise<void> {
    //     return room.setSharedPlayerVariable(variableMessage.getName(), variableMessage.getValue(), user);
    // }

    emitVideo(room: GameRoom, user: User, data: WebRtcSignalToServerMessage): void {
        //send only at user
        const remoteUser = room.getUsers().get(data.getReceiverid());
        if (remoteUser === undefined) {
            console.warn(
                "While exchanging a WebRTC signal: client with id ",
                data.getReceiverid(),
                " does not exist. This might be a race condition."
            );
            return;
        }

        const webrtcSignalToClient = new WebRtcSignalToClientMessage();
        webrtcSignalToClient.setUserid(user.id);
        webrtcSignalToClient.setSignal(data.getSignal());
        // TODO: only compute credentials if data.signal.type === "offer"
        if (TURN_STATIC_AUTH_SECRET !== "") {
            const { username, password } = this.getTURNCredentials(user.id.toString(), TURN_STATIC_AUTH_SECRET);
            webrtcSignalToClient.setWebrtcusername(username);
            webrtcSignalToClient.setWebrtcpassword(password);
        }

        const serverToClientMessage = new ServerToClientMessage();
        serverToClientMessage.setWebrtcsignaltoclientmessage(webrtcSignalToClient);

        //if (!client.disconnecting) {
        remoteUser.socket.write(serverToClientMessage);
        //}
    }

    emitScreenSharing(room: GameRoom, user: User, data: WebRtcSignalToServerMessage): void {
        //send only at user
        const remoteUser = room.getUsers().get(data.getReceiverid());
        if (remoteUser === undefined) {
            console.warn(
                "While exchanging a WEBRTC_SCREEN_SHARING signal: client with id ",
                data.getReceiverid(),
                " does not exist. This might be a race condition."
            );
            return;
        }

        const webrtcSignalToClient = new WebRtcSignalToClientMessage();
        webrtcSignalToClient.setUserid(user.id);
        webrtcSignalToClient.setSignal(data.getSignal());
        // TODO: only compute credentials if data.signal.type === "offer"
        if (TURN_STATIC_AUTH_SECRET !== "") {
            const { username, password } = this.getTURNCredentials(user.id.toString(), TURN_STATIC_AUTH_SECRET);
            webrtcSignalToClient.setWebrtcusername(username);
            webrtcSignalToClient.setWebrtcpassword(password);
        }

        const serverToClientMessage = new ServerToClientMessage();
        serverToClientMessage.setWebrtcscreensharingsignaltoclientmessage(webrtcSignalToClient);

        //if (!client.disconnecting) {
        remoteUser.socket.write(serverToClientMessage);
        //}
    }

    leaveRoom(room: GameRoom, user: User) {
        // leave previous room and world
        try {
            //user leave previous world
            room.leave(user);
            this.cleanupRoomIfEmpty(room);
        } finally {
            clientEventsEmitter.emitClientLeave(user.uuid, room.roomUrl);
            console.log("A user left");
        }
    }

    async getOrCreateRoom(roomId: string): Promise<GameRoom> {
        //check and create new room
        let roomPromise = this.roomsPromises.get(roomId);
        if (roomPromise === undefined) {
            roomPromise = GameRoom.create(
                roomId,
                (user: User, group: Group) => {
                    this.joinWebRtcRoom(user, group);
                    this.sendGroupUsersUpdateToGroupMembers(group);
                },
                (user: User, group: Group) => {
                    this.disConnectedUser(user, group);
                    this.sendGroupUsersUpdateToGroupMembers(group);
                },
                MINIMUM_DISTANCE,
                GROUP_RADIUS,
                (thing: Movable, fromZone: Zone | null, listener: ZoneSocket) => {
                    this.onZoneEnter(thing, fromZone, listener);
                },
                (thing: Movable, position: PositionInterface, listener: ZoneSocket) =>
                    this.onClientMove(thing, position, listener),
                (thing: Movable, newZone: Zone | null, listener: ZoneSocket) =>
                    this.onClientLeave(thing, newZone, listener),
                (emoteEventMessage: EmoteEventMessage, listener: ZoneSocket) =>
                    this.onEmote(emoteEventMessage, listener),
                (groupId: number, listener: ZoneSocket) => {
                    void this.onLockGroup(groupId, listener, roomPromise);
                },
                (playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage, listener: ZoneSocket) =>
                    this.onPlayerDetailsUpdated(playerDetailsUpdatedMessage, listener)
            )
                .then((gameRoom) => {
                    gaugeManager.incNbRoomGauge();
                    this.resolvedRooms.set(roomId, gameRoom);
                    return gameRoom;
                })
                .catch((e) => {
                    this.roomsPromises.delete(roomId);
                    throw e;
                });
            this.roomsPromises.set(roomId, roomPromise);
        }
        return roomPromise;
    }

    private async joinRoom(
        socket: UserSocket,
        joinRoomMessage: JoinRoomMessage
    ): Promise<{ room: GameRoom; user: User }> {
        const roomId = joinRoomMessage.getRoomid();

        const room = await socketManager.getOrCreateRoom(roomId);

        //join world
        const user = await room.join(socket, joinRoomMessage);

        clientEventsEmitter.emitClientJoin(user.uuid, roomId);
        console.log(new Date().toISOString() + " A user joined");
        return { room, user };
    }

    private onZoneEnter(thing: Movable, fromZone: Zone | null, listener: ZoneSocket) {
        if (thing instanceof User) {
            const subMessage = SocketManager.toUserJoinedZoneMessage(thing, fromZone);
            emitZoneMessage(subMessage, listener);
            //listener.emitInBatch(subMessage);
        } else if (thing instanceof Group) {
            this.emitCreateUpdateGroupEvent(listener, fromZone, thing);
        } else {
            console.error("Unexpected type for Movable.");
        }
    }

    private static toUserJoinedZoneMessage(user: User, fromZone?: Zone | null): SubToPusherMessage {
        const userJoinedZoneMessage = new UserJoinedZoneMessage();
        if (!Number.isInteger(user.id)) {
            throw new Error(`clientUser.userId is not an integer ${user.id}`);
        }
        userJoinedZoneMessage.setUserid(user.id);
        userJoinedZoneMessage.setUserjid(user.userJid);
        userJoinedZoneMessage.setUseruuid(user.uuid);
        userJoinedZoneMessage.setName(user.name);
        userJoinedZoneMessage.setAvailabilitystatus(user.getAvailabilityStatus());
        userJoinedZoneMessage.setCharacterlayersList(ProtobufUtils.toCharacterLayerMessages(user.characterLayers));
        userJoinedZoneMessage.setPosition(ProtobufUtils.toPositionMessage(user.getPosition()));
        if (fromZone) {
            userJoinedZoneMessage.setFromzone(SocketManager.toProtoZone(fromZone));
        }
        if (user.visitCardUrl) {
            userJoinedZoneMessage.setVisitcardurl(user.visitCardUrl);
        }
        userJoinedZoneMessage.setCompanion(user.companion);
        const outlineColor = user.getOutlineColor();
        if (outlineColor === undefined) {
            userJoinedZoneMessage.setHasoutline(false);
        } else {
            userJoinedZoneMessage.setHasoutline(true);
            userJoinedZoneMessage.setOutlinecolor(outlineColor);
        }
        for (const entry of user.getVariables().getVariables().entries()) {
            const key = entry[0];
            const value = entry[1].value;
            const isPublic = entry[1].isPublic;
            if (isPublic) {
                userJoinedZoneMessage.getVariablesMap().set(key, value);
            }
        }

        const subMessage = new SubToPusherMessage();
        subMessage.setUserjoinedzonemessage(userJoinedZoneMessage);

        return subMessage;
    }

    private onClientMove(thing: Movable, position: PositionInterface, listener: ZoneSocket): void {
        if (thing instanceof User) {
            const userMovedMessage = new UserMovedMessage();
            userMovedMessage.setUserid(thing.id);
            userMovedMessage.setPosition(ProtobufUtils.toPositionMessage(thing.getPosition()));

            const subMessage = new SubToPusherMessage();
            subMessage.setUsermovedmessage(userMovedMessage);

            emitZoneMessage(subMessage, listener);
            //listener.emitInBatch(subMessage);
            //console.log("Sending USER_MOVED event");
        } else if (thing instanceof Group) {
            this.emitCreateUpdateGroupEvent(listener, null, thing);
        } else {
            console.error("Unexpected type for Movable.");
        }
    }

    private onClientLeave(thing: Movable, newZone: Zone | null, listener: ZoneSocket) {
        if (thing instanceof User) {
            this.emitUserLeftEvent(listener, thing.id, newZone);
        } else if (thing instanceof Group) {
            this.emitDeleteGroupEvent(listener, thing.getId(), newZone);
        } else {
            console.error("Unexpected type for Movable.");
        }
    }

    private onEmote(emoteEventMessage: EmoteEventMessage, client: ZoneSocket) {
        const subMessage = new SubToPusherMessage();
        subMessage.setEmoteeventmessage(emoteEventMessage);

        emitZoneMessage(subMessage, client);
    }

    private async onLockGroup(
        groupId: number,
        client: ZoneSocket,
        roomPromise: PromiseLike<GameRoom> | undefined
    ): Promise<void> {
        if (!roomPromise) {
            return;
        }
        const group = (await roomPromise).getGroupById(groupId);
        if (!group) {
            return;
        }
        this.emitCreateUpdateGroupEvent(client, null, group);
    }

    private onPlayerDetailsUpdated(playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage, client: ZoneSocket) {
        const subMessage = new SubToPusherMessage();
        subMessage.setPlayerdetailsupdatedmessage(playerDetailsUpdatedMessage);
        emitZoneMessage(subMessage, client);
    }

    private emitCreateUpdateGroupEvent(client: ZoneSocket, fromZone: Zone | null, group: Group): void {
        const position = group.getPosition();
        const pointMessage = new PointMessage();
        pointMessage.setX(Math.floor(position.x));
        pointMessage.setY(Math.floor(position.y));
        const groupUpdateMessage = new GroupUpdateZoneMessage();
        groupUpdateMessage.setGroupid(group.getId());
        groupUpdateMessage.setPosition(pointMessage);
        groupUpdateMessage.setGroupsize(group.getSize);
        groupUpdateMessage.setFromzone(SocketManager.toProtoZone(fromZone));
        groupUpdateMessage.setLocked(group.isLocked());

        const subMessage = new SubToPusherMessage();
        subMessage.setGroupupdatezonemessage(groupUpdateMessage);

        emitZoneMessage(subMessage, client);
        //client.emitInBatch(subMessage);
    }

    private emitDeleteGroupEvent(client: ZoneSocket, groupId: number, newZone: Zone | null): void {
        const groupDeleteMessage = new GroupLeftZoneMessage();
        groupDeleteMessage.setGroupid(groupId);
        groupDeleteMessage.setTozone(SocketManager.toProtoZone(newZone));

        const subMessage = new SubToPusherMessage();
        subMessage.setGroupleftzonemessage(groupDeleteMessage);
        emitZoneMessage(subMessage, client);
        //user.emitInBatch(subMessage);
    }

    private emitUserLeftEvent(client: ZoneSocket, userId: number, newZone: Zone | null): void {
        const userLeftMessage = new UserLeftZoneMessage();
        userLeftMessage.setUserid(userId);
        userLeftMessage.setTozone(SocketManager.toProtoZone(newZone));

        const subMessage = new SubToPusherMessage();
        subMessage.setUserleftzonemessage(userLeftMessage);
        emitZoneMessage(subMessage, client);
    }

    private static toProtoZone(zone: Zone | null): ProtoZone | undefined {
        if (zone !== null) {
            const zoneMessage = new ProtoZone();
            zoneMessage.setX(zone.x);
            zoneMessage.setY(zone.y);
            return zoneMessage;
        }
        return undefined;
    }

    private sendGroupUsersUpdateToGroupMembers(group: Group) {
        const groupUserUpdateMessage = new GroupUsersUpdateMessage();
        groupUserUpdateMessage.setGroupid(group.getId());
        groupUserUpdateMessage.setUseridsList(group.getUsers().map((user) => user.id));

        const clientMessage = new ServerToClientMessage();
        clientMessage.setGroupusersupdatemessage(groupUserUpdateMessage);

        group.getUsers().forEach((currentUser: User) => {
            currentUser.socket.write(clientMessage);
        });
    }

    private joinWebRtcRoom(user: User, group: Group) {
        for (const otherUser of group.getUsers()) {
            if (user === otherUser) {
                continue;
            }

            // Let's send 2 messages: one to the user joining the group and one to the other user
            const webrtcStartMessage1 = new WebRtcStartMessage();
            webrtcStartMessage1.setUserid(otherUser.id);
            webrtcStartMessage1.setInitiator(true);
            if (TURN_STATIC_AUTH_SECRET !== "") {
                const { username, password } = this.getTURNCredentials(
                    otherUser.id.toString(),
                    TURN_STATIC_AUTH_SECRET
                );
                webrtcStartMessage1.setWebrtcusername(username);
                webrtcStartMessage1.setWebrtcpassword(password);
            }

            const serverToClientMessage1 = new ServerToClientMessage();
            serverToClientMessage1.setWebrtcstartmessage(webrtcStartMessage1);

            user.socket.write(serverToClientMessage1);

            const webrtcStartMessage2 = new WebRtcStartMessage();
            webrtcStartMessage2.setUserid(user.id);
            webrtcStartMessage2.setInitiator(false);
            if (TURN_STATIC_AUTH_SECRET !== "") {
                const { username, password } = this.getTURNCredentials(user.id.toString(), TURN_STATIC_AUTH_SECRET);
                webrtcStartMessage2.setWebrtcusername(username);
                webrtcStartMessage2.setWebrtcpassword(password);
            }

            const serverToClientMessage2 = new ServerToClientMessage();
            serverToClientMessage2.setWebrtcstartmessage(webrtcStartMessage2);

            otherUser.socket.write(serverToClientMessage2);
        }
    }

    /**
     * Computes a unique user/password for the TURN server, using a shared secret between the WorkAdventure API server
     * and the Coturn server.
     * The Coturn server should be initialized with parameters: `--use-auth-secret --static-auth-secret=MySecretKey`
     */
    private getTURNCredentials(name: string, secret: string): { username: string; password: string } {
        const unixTimeStamp = Math.floor(Date.now() / 1000) + 4 * 3600; // this credential would be valid for the next 4 hours
        const username = [unixTimeStamp, name].join(":");
        const hmac = crypto.createHmac("sha1", secret);
        hmac.setEncoding("base64");
        hmac.write(username);
        hmac.end();
        const password = hmac.read() as string;
        return {
            username: username,
            password: password,
        };
    }

    //disconnect user
    private disConnectedUser(user: User, group: Group) {
        // Most of the time, sending a disconnect event to one of the players is enough (the player will close the connection
        // which will be shut for the other player).
        // However! In the rare case where the WebRTC connection is not yet established, if we close the connection on one of the player,
        // the other player will try connecting until a timeout happens (during this time, the connection icon will be displayed for nothing).
        // So we also send the disconnect event to the other player.
        for (const otherUser of group.getUsers()) {
            if (user === otherUser) {
                continue;
            }

            const webrtcDisconnectMessage1 = new WebRtcDisconnectMessage();
            webrtcDisconnectMessage1.setUserid(user.id);

            const serverToClientMessage1 = new ServerToClientMessage();
            serverToClientMessage1.setWebrtcdisconnectmessage(webrtcDisconnectMessage1);

            //if (!otherUser.socket.disconnecting) {
            otherUser.socket.write(serverToClientMessage1);
            //}

            const webrtcDisconnectMessage2 = new WebRtcDisconnectMessage();
            webrtcDisconnectMessage2.setUserid(otherUser.id);

            const serverToClientMessage2 = new ServerToClientMessage();
            serverToClientMessage2.setWebrtcdisconnectmessage(webrtcDisconnectMessage2);

            //if (!user.socket.disconnecting) {
            user.socket.write(serverToClientMessage2);
            //}
        }
    }

    public getWorlds(): Map<string, PromiseLike<GameRoom>> {
        return this.roomsPromises;
    }

    public async handleQueryMessage(gameRoom: GameRoom, user: User, queryMessage: QueryMessage): Promise<void> {
        const queryCase = queryMessage.getQueryCase();
        const answerMessage = new AnswerMessage();
        answerMessage.setId(queryMessage.getId());

        try {
            switch (queryCase) {
                case QueryCase.QUERY_NOT_SET:
                    throw new Error("Query case not set");
                case QueryMessage.QueryCase.JITSIJWTQUERY: {
                    const answer = await this.handleQueryJitsiJwtMessage(
                        gameRoom,
                        user,
                        queryMessage.getJitsijwtquery() as JitsiJwtQuery
                    );
                    answerMessage.setJitsijwtanswer(answer);
                    break;
                }
                case QueryMessage.QueryCase.JOINBBBMEETINGQUERY: {
                    const answer = await this.handleJoinBBBMeetingMessage(
                        gameRoom,
                        user,
                        queryMessage.getJoinbbbmeetingquery() as JoinBBBMeetingQuery
                    );
                    answerMessage.setJoinbbbmeetinganswer(answer);
                    break;
                }
                default: {
                    const _exhaustiveCheck: never = queryCase;
                }
            }
        } catch (e) {
            console.error("An error happened while answering a query:", e);
            const errorMessage = new ErrorMessage();
            errorMessage.setMessage(
                e !== null && typeof e === "object" ? e.toString() : typeof e === "string" ? e : "Unknown error"
            );
            answerMessage.setError(errorMessage);
        }

        const serverToClientMessage = new ServerToClientMessage();
        serverToClientMessage.setAnswermessage(answerMessage);

        user.socket.write(serverToClientMessage);
    }

    public async handleQueryJitsiJwtMessage(
        gameRoom: GameRoom,
        user: User,
        queryJitsiJwtMessage: JitsiJwtQuery
    ): Promise<JitsiJwtAnswer> {
        const jitsiRoom = queryJitsiJwtMessage.getJitsiroom();
        const jitsiSettings = gameRoom.getJitsiSettings();

        if (jitsiSettings === undefined || !jitsiSettings.secret) {
            throw new Error("You must set the SECRET_JITSI_KEY key to the secret to generate JWT tokens for Jitsi.");
        }

        // Let's see if the current client has moderator rights
        let isAdmin = false;
        if (user.tags.includes("admin")) {
            isAdmin = true;
        } else {
            // Let's remove the prefix added by the front to make the Jitsi room unique:
            // Note: this is not 100% perfect as this will fail on Jitsi rooms with "NoPrefix" option set and containing a "-" in the room name.
            const jitsiRoomSuffix = jitsiRoom.match(/\w*-(.+)/);
            const finalRoomName = jitsiRoomSuffix && jitsiRoomSuffix[1] ? jitsiRoomSuffix[1] : jitsiRoom;
            const moderatorTag = await gameRoom.getModeratorTagForJitsiRoom(finalRoomName);
            if (moderatorTag && user.tags.includes(moderatorTag)) {
                isAdmin = true;
            }
        }

        const jwt = Jwt.sign(
            {
                aud: "jitsi",
                iss: jitsiSettings.iss,
                sub: jitsiSettings.url,
                room: jitsiRoom,
                moderator: isAdmin,
            },
            jitsiSettings.secret,
            {
                expiresIn: "1d",
                algorithm: "HS256",
                header: {
                    alg: "HS256",
                    typ: "JWT",
                },
            }
        );

        const jitsiJwtAnswer = new JitsiJwtAnswer();
        jitsiJwtAnswer.setJwt(jwt);
        jitsiJwtAnswer.setUrl(jitsiSettings.url);

        return jitsiJwtAnswer;
    }

    public async handleJoinBBBMeetingMessage(
        gameRoom: GameRoom,
        user: User,
        joinBBBMeetingQuery: JoinBBBMeetingQuery
    ): Promise<JoinBBBMeetingAnswer> {
        const meetingId = joinBBBMeetingQuery.getMeetingid();
        const localMeetingId = joinBBBMeetingQuery.getLocalmeetingid();
        const meetingName = joinBBBMeetingQuery.getMeetingname();
        const bbbSettings = gameRoom.getBbbSettings();

        if (bbbSettings === undefined) {
            throw new Error(
                "Unable to join the conference because either " +
                    "the BBB_URL or BBB_SECRET environment variables are not set."
            );
        }

        // Let's see if the current client has moderator rights
        let isAdmin = false;
        if (user.tags.includes("admin")) {
            isAdmin = true;
        } else {
            const moderatorTag = await gameRoom.getModeratorTagForBbbMeeting(localMeetingId);
            if (moderatorTag && user.tags.includes(moderatorTag)) {
                isAdmin = true;
            } else if (moderatorTag === undefined) {
                // If the bbbMeetingAdminTag is not set, everyone is a moderator.
                isAdmin = true;
            }
        }

        const api = BigbluebuttonJs.api(bbbSettings.url, bbbSettings.secret);
        // It seems bbb-api is limiting password length to 50 chars
        const maxPWLen = 50;
        const attendeePW = crypto
            .createHmac("sha256", bbbSettings.secret)
            .update(`attendee-${meetingId}`)
            .digest("hex")
            .slice(0, maxPWLen);
        const moderatorPW = crypto
            .createHmac("sha256", bbbSettings.secret)
            .update(`moderator-${meetingId}`)
            .digest("hex")
            .slice(0, maxPWLen);

        // This is idempotent, so we call it on each join in order to be sure that the meeting exists.
        const createOptions = { attendeePW, moderatorPW, record: true };
        const createURL = api.administration.create(meetingName, meetingId, createOptions);
        await BigbluebuttonJs.http(createURL);

        const joinParams: Record<string, string> = {};

        // XXX: figure out how to know if the user has admin status and use the moderatorPW
        // in that case
        const clientURL = api.administration.join(user.name, meetingId, isAdmin ? moderatorPW : attendeePW, {
            ...joinParams,
            userID: user.id,
            joinViaHtml5: true,
        });
        console.log(
            `User "${user.name}" (${user.uuid}) joined the BBB meeting "${meetingName}" as ${
                isAdmin ? "Admin" : "Participant"
            }.`
        );

        const bbbMeetingAnswer = new JoinBBBMeetingAnswer();
        bbbMeetingAnswer.setMeetingid(meetingId);
        bbbMeetingAnswer.setClienturl(clientURL);

        return bbbMeetingAnswer;
    }

    public handleSendUserMessage(user: User, sendUserMessageToSend: SendUserMessage) {
        const sendUserMessage = new SendUserMessage();
        sendUserMessage.setMessage(sendUserMessageToSend.getMessage());
        sendUserMessage.setType(sendUserMessageToSend.getType());

        const serverToClientMessage = new ServerToClientMessage();
        serverToClientMessage.setSendusermessage(sendUserMessage);
        user.socket.write(serverToClientMessage);
    }

    public handlerBanUserMessage(room: GameRoom, user: User, banUserMessageToSend: BanUserMessage) {
        const banUserMessage = new BanUserMessage();
        banUserMessage.setMessage(banUserMessageToSend.getMessage());
        banUserMessage.setType(banUserMessageToSend.getType());

        const serverToClientMessage = new ServerToClientMessage();
        serverToClientMessage.setSendusermessage(banUserMessage);
        user.socket.write(serverToClientMessage);

        setTimeout(() => {
            // Let's leave the room now.
            room.leave(user);
            // Let's close the connection when the user is banned.
            user.socket.end();
        }, 10000);
    }

    public async addZoneListener(call: ZoneSocket, roomId: string, x: number, y: number): Promise<void> {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            throw new Error("In addZoneListener, could not find room with id '" + roomId + "'");
        }

        const things = room.addZoneListener(call, x, y);

        const batchMessage = new BatchToPusherMessage();

        for (const thing of things) {
            if (thing instanceof User) {
                const subMessage = SocketManager.toUserJoinedZoneMessage(thing);

                batchMessage.addPayload(subMessage);
            } else if (thing instanceof Group) {
                const groupUpdateMessage = new GroupUpdateZoneMessage();
                groupUpdateMessage.setGroupid(thing.getId());
                groupUpdateMessage.setPosition(ProtobufUtils.toPointMessage(thing.getPosition()));
                groupUpdateMessage.setLocked(thing.isLocked());

                const subMessage = new SubToPusherMessage();
                subMessage.setGroupupdatezonemessage(groupUpdateMessage);

                batchMessage.addPayload(subMessage);
            } else {
                console.error("Unexpected type for Movable returned by setViewport");
            }
        }

        call.write(batchMessage);
    }

    async removeZoneListener(call: ZoneSocket, roomId: string, x: number, y: number): Promise<void> {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            console.warn("In removeZoneListener, could not find room with id '" + roomId + "'");
            return;
        }

        room.removeZoneListener(call, x, y);
        this.cleanupRoomIfEmpty(room);
    }

    async addRoomListener(call: RoomSocket, roomId: string) {
        const room = await this.getOrCreateRoom(roomId);
        if (!room) {
            throw new Error("In addRoomListener, could not find room with id '" + roomId + "'");
        }

        room.addRoomListener(call);

        const batchMessage = new BatchToPusherRoomMessage();

        call.write(batchMessage);
    }

    async removeRoomListener(call: RoomSocket, roomId: string) {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            throw new Error("In removeRoomListener, could not find room with id '" + roomId + "'");
        }

        room.removeRoomListener(call);
    }

    public async handleJoinAdminRoom(admin: Admin, roomId: string): Promise<GameRoom> {
        const room = await socketManager.getOrCreateRoom(roomId);

        room.adminJoin(admin);

        return room;
    }

    public leaveAdminRoom(room: GameRoom, admin: Admin) {
        room.adminLeave(admin);
        this.cleanupRoomIfEmpty(room);
    }

    private cleanupRoomIfEmpty(room: GameRoom): void {
        if (room.isEmpty()) {
            this.roomsPromises.delete(room.roomUrl);
            const deleted = this.resolvedRooms.delete(room.roomUrl);
            if (deleted) {
                gaugeManager.decNbRoomGauge();
            }
            debug('Room is empty. Deleting room "%s"', room.roomUrl);
        }
    }

    public async sendAdminMessage(roomId: string, recipientUuid: string, message: string, type: string): Promise<void> {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            console.error(
                "In sendAdminMessage, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        const recipients = room.getUsersByUuid(recipientUuid);
        if (recipients.size === 0) {
            console.error(
                "In sendAdminMessage, could not find user with id '" +
                    recipientUuid +
                    "'. Maybe the user left the room a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        for (const recipient of recipients) {
            const sendUserMessage = new SendUserMessage();
            sendUserMessage.setMessage(message);
            sendUserMessage.setType(type);

            const serverToClientMessage = new ServerToClientMessage();
            serverToClientMessage.setSendusermessage(sendUserMessage);

            recipient.socket.write(serverToClientMessage);
        }
    }

    public async banUser(roomId: string, recipientUuid: string, message: string): Promise<void> {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            console.error(
                "In banUser, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        const recipients = room.getUsersByUuid(recipientUuid);
        if (recipients.size === 0) {
            console.error(
                "In banUser, could not find user with id '" +
                    recipientUuid +
                    "'. Maybe the user left the room a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        for (const recipient of recipients) {
            // Let's leave the room now.
            room.leave(recipient);

            const banUserMessage = new BanUserMessage();
            banUserMessage.setMessage(message);
            banUserMessage.setType("banned");

            const serverToClientMessage = new ServerToClientMessage();
            serverToClientMessage.setBanusermessage(banUserMessage);

            // Let's close the connection when the user is banned.
            recipient.socket.write(serverToClientMessage);
            recipient.socket.end();
        }
    }

    async sendAdminRoomMessage(roomId: string, message: string, type: string) {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            //todo: this should cause the http call to return a 500
            console.error(
                "In sendAdminRoomMessage, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        room.getUsers().forEach((recipient) => {
            const sendUserMessage = new SendUserMessage();
            sendUserMessage.setMessage(message);
            sendUserMessage.setType(type);

            const clientMessage = new ServerToClientMessage();
            clientMessage.setSendusermessage(sendUserMessage);

            recipient.socket.write(clientMessage);
        });
    }

    async dispatchWorldFullWarning(roomId: string): Promise<void> {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            //todo: this should cause the http call to return a 500
            console.error(
                "In dispatchWorldFullWarning, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        room.getUsers().forEach((recipient) => {
            const worldFullMessage = new WorldFullWarningMessage();

            const clientMessage = new ServerToClientMessage();
            clientMessage.setWorldfullwarningmessage(worldFullMessage);

            recipient.socket.write(clientMessage);
        });
    }

    async dispatchRoomRefresh(roomId: string): Promise<void> {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            return;
        }

        const versionNumber = await room.incrementVersion();
        room.getUsers().forEach((recipient) => {
            const refreshRoomMessage = new RefreshRoomMessage();
            refreshRoomMessage.setRoomid(roomId);
            refreshRoomMessage.setVersionnumber(versionNumber);

            const clientMessage = new ServerToClientMessage();
            clientMessage.setRefreshroommessage(refreshRoomMessage);

            recipient.socket.write(clientMessage);
        });
    }

    handleEmoteEventMessage(room: GameRoom, user: User, emotePromptMessage: EmotePromptMessage) {
        const emoteEventMessage = new EmoteEventMessage();
        emoteEventMessage.setEmote(emotePromptMessage.getEmote());
        emoteEventMessage.setActoruserid(user.id);
        room.emitEmoteEvent(user, emoteEventMessage);
    }

    handleFollowRequestMessage(room: GameRoom, user: User, message: FollowRequestMessage) {
        const clientMessage = new ServerToClientMessage();
        clientMessage.setFollowrequestmessage(message);
        room.sendToOthersInGroupIncludingUser(user, clientMessage);
    }

    handleFollowConfirmationMessage(room: GameRoom, user: User, message: FollowConfirmationMessage) {
        const leader = room.getUserById(message.getLeader());
        if (!leader) {
            const message = `Could not follow user "{message.getLeader()}" in room "{room.roomUrl}".`;
            console.info(message, "Maybe the user just left.");
            return;
        }

        // By security, we look at the group leader. If the group leader is NOT the leader in the message,
        // everybody should stop following the group leader (to avoid having 2 group leaders)
        if (user?.group?.leader && user?.group?.leader !== leader) {
            user?.group?.leader?.stopLeading();
        }

        leader.addFollower(user);
    }

    handleFollowAbortMessage(room: GameRoom, user: User, message: FollowAbortMessage) {
        if (user.id === message.getLeader()) {
            user?.group?.leader?.stopLeading();
        } else {
            // Forward message
            const leader = room.getUserById(message.getLeader());
            leader?.delFollower(user);
        }
    }

    handleLockGroupPromptMessage(room: GameRoom, user: User, message: LockGroupPromptMessage) {
        const group = user.group;
        if (!group) {
            return;
        }
        group.lock(message.getLock());
        room.emitLockGroupEvent(user, group.getId());
    }

    handleEditMapCommandMessage(room: GameRoom, user: User, message: EditMapCommandMessage) {
        const messageWithKey = new EditMapCommandWithKeyMessage();
        messageWithKey.setEditmapcommandmessage(message);
        messageWithKey.setMapkey(room.mapUrl);

        getMapStorageClient().handleEditMapCommandWithKeyMessage(
            messageWithKey,
            (err: unknown, editMapMessage: EditMapCommandMessage) => {
                if (err) {
                    emitError(user.socket, err);
                    throw err;
                }
                const subMessage = new SubToPusherRoomMessage();
                subMessage.setEditmapcommandmessage(editMapMessage);
                room.dispatchRoomMessage(subMessage);
            }
        );
    }

    handleUpdateMapToNewestMessage(room: GameRoom, user: User, message: UpdateMapToNewestWithKeyMessage) {
        getMapStorageClient().handleUpdateMapToNewestMessage(
            message,
            (err: unknown, message: EditMapCommandsArrayMessage) => {
                if (err) {
                    emitError(user.socket, err);
                    throw err;
                }
                const commands = message.getEditmapcommandsList();
                for (const editMapCommandMessage of commands) {
                    const subMessage = new SubMessage();
                    subMessage.setEditmapcommandmessage(editMapCommandMessage);
                    user.emitInBatch(subMessage);
                }
            }
        );
    }

    getAllRooms(): RoomsList {
        const roomsList = new RoomsList();

        for (const room of this.resolvedRooms.values()) {
            const roomDescription = new RoomDescription();
            roomDescription.setRoomid(room.roomUrl);
            roomDescription.setNbusers(room.getUsers().size);

            roomsList.addRoomdescription(roomDescription);
        }

        return roomsList;
    }

    handleAskPositionMessage(room: GameRoom, user: User, askPositionMessage: AskPositionMessage) {
        const moveToPositionMessage = new MoveToPositionMessage();

        if (room) {
            const userToJoin = room.getUserByUuid(askPositionMessage.getUseridentifier());
            const position = userToJoin?.getPosition();
            if (position) {
                moveToPositionMessage.setPosition(ProtobufUtils.toPositionMessage(position));

                const clientMessage = new ServerToClientMessage();
                clientMessage.setMovetopositionmessage(moveToPositionMessage);
                user.socket.write(clientMessage);
            }

            if (room.isEmpty()) {
                // TODO delete room;
            }
        }
    }

    async dispatchChatMessagePrompt(chatMessagePrompt: ChatMessagePrompt): Promise<boolean> {
        const room = await this.roomsPromises.get(chatMessagePrompt.getRoomid());
        console.log(chatMessagePrompt.getRoomid());
        if (!room) {
            return false;
        }

        const subMessage = new SubToPusherRoomMessage();
        if (chatMessagePrompt.hasJoinmucroommessage()) {
            subMessage.setJoinmucroommessage(chatMessagePrompt.getJoinmucroommessage());
        } else if (chatMessagePrompt.hasLeavemucroommessage()) {
            subMessage.setLeavemucroommessage(chatMessagePrompt.getLeavemucroommessage());
        }
        room.sendSubMessageToRoom(subMessage);

        return true;
    }
}

export const socketManager = new SocketManager();
