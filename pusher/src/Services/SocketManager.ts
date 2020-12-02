import {PusherRoom} from "../Model/PusherRoom";
import {CharacterLayer, ExSocketInterface} from "../Model/Websocket/ExSocketInterface";
import {
    GroupDeleteMessage,
    GroupUpdateMessage,
    ItemEventMessage,
    ItemStateMessage,
    PlayGlobalMessage,
    PointMessage,
    PositionMessage,
    RoomJoinedMessage,
    ServerToClientMessage,
    SetPlayerDetailsMessage,
    SilentMessage,
    SubMessage,
    ReportPlayerMessage,
    UserJoinedMessage, UserLeftMessage,
    UserMovedMessage,
    UserMovesMessage,
    ViewportMessage, WebRtcDisconnectMessage,
    WebRtcSignalToClientMessage,
    WebRtcSignalToServerMessage,
    WebRtcStartMessage,
    QueryJitsiJwtMessage,
    SendJitsiJwtMessage,
    SendUserMessage, JoinRoomMessage, CharacterLayerMessage, PusherToBackMessage
} from "../Messages/generated/messages_pb";
import {PointInterface} from "../Model/Websocket/PointInterface";
import {User} from "../Model/User";
import {ProtobufUtils} from "../Model/Websocket/ProtobufUtils";
import {Group} from "../Model/Group";
import {cpuTracker} from "./CpuTracker";
import {isSetPlayerDetailsMessage} from "../Model/Websocket/SetPlayerDetailsMessage";
import {GROUP_RADIUS, JITSI_ISS, MINIMUM_DISTANCE, SECRET_JITSI_KEY} from "../Enum/EnvironmentVariable";
import {Movable} from "../Model/Movable";
import {PositionInterface} from "../Model/PositionInterface";
import {adminApi, CharacterTexture} from "./AdminApi";
import Direction = PositionMessage.Direction;
import {emitError, emitInBatch} from "./IoSocketHelpers";
import Jwt from "jsonwebtoken";
import {JITSI_URL} from "../Enum/EnvironmentVariable";
import {clientEventsEmitter} from "./ClientEventsEmitter";
import {gaugeManager} from "./GaugeManager";
import {apiClientRepository} from "./ApiClientRepository";
import {ServiceError} from "grpc";
import {GroupDescriptor, UserDescriptor, ZoneEventListener} from "_Model/Zone";
import Debug from "debug";

const debug = Debug('socket');

interface AdminSocketRoomsList {
    [index: string]: number;
}
interface AdminSocketUsersList {
    [index: string]: boolean;
}

export interface AdminSocketData {
    rooms: AdminSocketRoomsList,
    users: AdminSocketUsersList,
}

export class SocketManager implements ZoneEventListener {
    private Worlds: Map<string, PusherRoom> = new Map<string, PusherRoom>();
    private sockets: Map<number, ExSocketInterface> = new Map<number, ExSocketInterface>();

    constructor() {
        clientEventsEmitter.registerToClientJoin((clientUUid: string, roomId: string) => {
            gaugeManager.incNbClientPerRoomGauge(roomId);
        });
        clientEventsEmitter.registerToClientLeave((clientUUid: string, roomId: string) => {
            gaugeManager.decNbClientPerRoomGauge(roomId);
        });
    }

    getAdminSocketDataFor(roomId:string): AdminSocketData {
        throw new Error('Not reimplemented yet');
        /*const data:AdminSocketData = {
            rooms: {},
            users: {},
        }
        const room = this.Worlds.get(roomId);
        if (room === undefined) {
            return data;
        }
        const users = room.getUsers();
        data.rooms[roomId] = users.size;
        users.forEach(user => {
            data.users[user.uuid] = true
        })
        return data;*/
    }

    async handleJoinRoom(client: ExSocketInterface): Promise<void> {
        const position = client.position;
        const viewport = client.viewport;
        try {

            const joinRoomMessage = new JoinRoomMessage();
            joinRoomMessage.setUseruuid(client.userUuid);
            joinRoomMessage.setRoomid(client.roomId);
            joinRoomMessage.setName(client.name);
            joinRoomMessage.setPositionmessage(ProtobufUtils.toPositionMessage(client.position));
            for (const characterLayer of client.characterLayers) {
                const characterLayerMessage = new CharacterLayerMessage();
                characterLayerMessage.setName(characterLayer.name);
                if (characterLayer.url !== undefined) {
                    characterLayerMessage.setUrl(characterLayer.url);
                }

                joinRoomMessage.addCharacterlayer(characterLayerMessage);
            }


            console.log('Calling joinRoom')
            const apiClient = await apiClientRepository.getClient(client.roomId);
            const streamToPusher = apiClient.joinRoom();

            client.backConnection = streamToPusher;

            streamToPusher.on('data', (message: ServerToClientMessage) => {
                if (message.hasRoomjoinedmessage()) {
                    client.userId = (message.getRoomjoinedmessage() as RoomJoinedMessage).getCurrentuserid();
                    // TODO: do we need this.sockets anymore?
                    this.sockets.set(client.userId, client);

                    // If this is the first message sent, send back the viewport.
                    this.handleViewport(client, viewport);
                }

                // Let's pass data over from the back to the client.
                if (!client.disconnecting) {
                    client.send(message.serializeBinary().buffer, true);
                }
            }).on('end', () => {
                console.warn('Connection lost to back server');
                // Let's close the front connection if the back connection is closed. This way, we can retry connecting from the start.
                if (!client.disconnecting) {
                    this.closeWebsocketConnection(client);
                }
                console.log('A user left');
            }).on('error', (err: Error) => {
                console.error('Error in connection to back server:', err);
                if (!client.disconnecting) {
                    this.closeWebsocketConnection(client);
                }
            });

            const pusherToBackMessage = new PusherToBackMessage();
            pusherToBackMessage.setJoinroommessage(joinRoomMessage);
            streamToPusher.write(pusherToBackMessage);

            // TODO: analyze viewport, subscribe to correct handler

            //join new previous room
            //const gameRoom = this.joinRoom(client, position);

            //const things = gameRoom.setViewport(client, viewport);

            /*const roomJoinedMessage = new RoomJoinedMessage();

            for (const thing of things) {
                if (thing instanceof User) {
                    const player: ExSocketInterface|undefined = this.sockets.get(thing.id);
                    if (player === undefined) {
                        console.warn('Something went wrong. The World contains a user "'+thing.id+"' but this user does not exist in the sockets list!");
                        continue;
                    }

                    const userJoinedMessage = new UserJoinedMessage();
                    userJoinedMessage.setUserid(thing.id);
                    userJoinedMessage.setName(player.name);
                    userJoinedMessage.setCharacterlayersList(ProtobufUtils.toCharacterLayerMessages(player.characterLayers));
                    userJoinedMessage.setPosition(ProtobufUtils.toPositionMessage(player.position));

                    roomJoinedMessage.addUser(userJoinedMessage);
                    roomJoinedMessage.setTagList(client.tags);
                } else if (thing instanceof Group) {
                    const groupUpdateMessage = new GroupUpdateMessage();
                    groupUpdateMessage.setGroupid(thing.getId());
                    groupUpdateMessage.setPosition(ProtobufUtils.toPointMessage(thing.getPosition()));

                    roomJoinedMessage.addGroup(groupUpdateMessage);
                } else {
                    console.error("Unexpected type for Movable returned by setViewport");
                }
            }

            for (const [itemId, item] of gameRoom.getItemsState().entries()) {
                const itemStateMessage = new ItemStateMessage();
                itemStateMessage.setItemid(itemId);
                itemStateMessage.setStatejson(JSON.stringify(item));

                roomJoinedMessage.addItem(itemStateMessage);
            }

            roomJoinedMessage.setCurrentuserid(client.userId);

            const serverToClientMessage = new ServerToClientMessage();
            serverToClientMessage.setRoomjoinedmessage(roomJoinedMessage);

            if (!client.disconnecting) {
                client.send(serverToClientMessage.serializeBinary().buffer, true);
            }*/
        } catch (e) {
            console.error('An error occurred on "join_room" event');
            console.error(e);
        }
    }

    closeWebsocketConnection(client: ExSocketInterface) {
        client.disconnecting = true;
        //this.leaveRoom(client);
        client.close();
    }

    handleViewport(client: ExSocketInterface, viewport: ViewportMessage.AsObject) {
        try {
            client.viewport = viewport;

            const world = this.Worlds.get(client.roomId);
            if (!world) {
                console.error("In SET_VIEWPORT, could not find world with id '", client.roomId, "'");
                return;
            }
            world.setViewport(client, client.viewport);
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
            throw new Error('Missing viewport in UserMovesMessage');
        }

        // Now, we need to listen to the correct viewport.
        this.handleViewport(client, viewport.toObject())
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

        /*const itemEvent = ProtobufUtils.toItemEvent(itemEventMessage);

        try {
            const world = this.Worlds.get(ws.roomId);
            if (!world) {
                console.error("Could not find world with id '", ws.roomId, "'");
                return;
            }

            const subMessage = new SubMessage();
            subMessage.setItemeventmessage(itemEventMessage);

            // Let's send the event without using the SocketIO room.
            for (const user of world.getUsers().values()) {
                const client = this.searchClientByIdOrFail(user.id);
                //client.emit(SocketIoEvent.ITEM_EVENT, itemEvent);
                emitInBatch(client, subMessage);
            }

            world.setItemState(itemEvent.itemId, itemEvent.state);
        } catch (e) {
            console.error('An error occurred on "item_event"');
            console.error(e);
        }*/
    }

    async handleReportMessage(client: ExSocketInterface, reportPlayerMessage: ReportPlayerMessage) {
        try {
            const reportedSocket = this.sockets.get(reportPlayerMessage.getReporteduserid());
            if (!reportedSocket) {
                throw 'reported socket user not found';
            }
            //TODO report user on admin application
            await adminApi.reportPlayer(reportedSocket.userUuid, reportPlayerMessage.getReportcomment(),  client.userUuid)
        } catch (e) {
            console.error('An error occurred on "handleReportMessage"');
            console.error(e);
        }
    }

    emitVideo(socket: ExSocketInterface, data: WebRtcSignalToServerMessage): void {
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setWebrtcsignaltoservermessage(data);

        socket.backConnection.write(pusherToBackMessage);


        //send only at user
        /*const client = this.sockets.get(data.getReceiverid());
        if (client === undefined) {
            console.warn("While exchanging a WebRTC signal: client with id ", data.getReceiverid(), " does not exist. This might be a race condition.");
            return;
        }

        const webrtcSignalToClient = new WebRtcSignalToClientMessage();
        webrtcSignalToClient.setUserid(socket.userId);
        webrtcSignalToClient.setSignal(data.getSignal());

        const serverToClientMessage = new ServerToClientMessage();
        serverToClientMessage.setWebrtcsignaltoclientmessage(webrtcSignalToClient);

        if (!client.disconnecting) {
            client.send(serverToClientMessage.serializeBinary().buffer, true);
        }*/
    }

    emitScreenSharing(socket: ExSocketInterface, data: WebRtcSignalToServerMessage): void {
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setWebrtcscreensharingsignaltoservermessage(data);

        socket.backConnection.write(pusherToBackMessage);

        //send only at user
        /*const client = this.sockets.get(data.getReceiverid());
        if (client === undefined) {
            console.warn("While exchanging a WEBRTC_SCREEN_SHARING signal: client with id ", data.getReceiverid(), " does not exist. This might be a race condition.");
            return;
        }

        const webrtcSignalToClient = new WebRtcSignalToClientMessage();
        webrtcSignalToClient.setUserid(socket.userId);
        webrtcSignalToClient.setSignal(data.getSignal());

        const serverToClientMessage = new ServerToClientMessage();
        serverToClientMessage.setWebrtcscreensharingsignaltoclientmessage(webrtcSignalToClient);

        if (!client.disconnecting) {
            client.send(serverToClientMessage.serializeBinary().buffer, true);
        }*/
    }

    private searchClientByIdOrFail(userId: number): ExSocketInterface {
        const client: ExSocketInterface|undefined = this.sockets.get(userId);
        if (client === undefined) {
            throw new Error("Could not find user with id " + userId);
        }
        return client;
    }

    leaveRoom(socket : ExSocketInterface) {
        // leave previous room and world
        try {
            if (socket.roomId) {
                try {
                    //user leaves room
                    const room: PusherRoom | undefined = this.Worlds.get(socket.roomId);
                    if (room) {
                        debug('Leaving room %s.', socket.roomId);
                        room.leave(socket);
                        if (room.isEmpty()) {
                            this.Worlds.delete(socket.roomId);
                            debug('Room %s is empty. Deleting.', socket.roomId);
                        }
                    } else {
                        console.error('Could not find the GameRoom the user is leaving!');
                    }
                    //user leave previous room
                    //Client.leave(Client.roomId);
                } finally {
                    //delete Client.roomId;
                    this.sockets.delete(socket.userId);
                    clientEventsEmitter.emitClientLeave(socket.userUuid, socket.roomId);
                    console.log('A user left (', this.sockets.size, ' connected users)');
                }
            }
        } finally {
            if (socket.backConnection) {
                socket.backConnection.end();
            }
        }
    }

    async getOrCreateRoom(roomId: string): Promise<PusherRoom> {
        //check and create new world for a room
        let world = this.Worlds.get(roomId)
        if(world === undefined){
            world = new PusherRoom(
                roomId,
                this
/*                (user: User, group: Group) => this.joinWebRtcRoom(user, group),
                (user: User, group: Group) => this.disConnectedUser(user, group),
                MINIMUM_DISTANCE,
                GROUP_RADIUS,
                (thing: Movable, listener: User) => this.onRoomEnter(thing, listener),
                (thing: Movable, position:PositionInterface, listener:User) => this.onClientMove(thing, position, listener),
                (thing: Movable, listener:User) => this.onClientLeave(thing, listener)*/
            );
            if (!world.anonymous) {
                const data = await adminApi.fetchMapDetails(world.organizationSlug, world.worldSlug, world.roomSlug)
                world.tags = data.tags
                world.policyType = Number(data.policy_type)
            }
            this.Worlds.set(roomId, world);
        }
        return Promise.resolve(world)
    }

/*    private joinRoom(client : ExSocketInterface, position: PointInterface): PusherRoom {

        const roomId = client.roomId;
        client.position = position;

        const world = this.Worlds.get(roomId)
        if(world === undefined){
            throw new Error('Could not find room for ID: '+client.roomId)
        }

        // Dispatch groups position to newly connected user
        world.getGroups().forEach((group: Group) => {
            this.emitCreateUpdateGroupEvent(client, group);
        });
        //join world
        world.join(client, client.position);
        clientEventsEmitter.emitClientJoin(client.userUuid, client.roomId);
        console.log(new Date().toISOString() + ' A user joined (', this.sockets.size, ' connected users)');
        return world;
    }

    private onClientMove(thing: Movable, position:PositionInterface, listener:User): void {
        const clientListener = this.searchClientByIdOrFail(listener.id);
        if (thing instanceof User) {
            const clientUser = this.searchClientByIdOrFail(thing.id);

            const userMovedMessage = new UserMovedMessage();
            userMovedMessage.setUserid(clientUser.userId);
            userMovedMessage.setPosition(ProtobufUtils.toPositionMessage(clientUser.position));

            const subMessage = new SubMessage();
            subMessage.setUsermovedmessage(userMovedMessage);

            clientListener.emitInBatch(subMessage);
            //console.log("Sending USER_MOVED event");
        } else if (thing instanceof Group) {
            this.emitCreateUpdateGroupEvent(clientListener, thing);
        } else {
            console.error('Unexpected type for Movable.');
        }
    }

    private onClientLeave(thing: Movable, listener:User) {
        const clientListener = this.searchClientByIdOrFail(listener.id);
        if (thing instanceof User) {
            const clientUser = this.searchClientByIdOrFail(thing.id);
            this.emitUserLeftEvent(clientListener, clientUser.userId);
        } else if (thing instanceof Group) {
            this.emitDeleteGroupEvent(clientListener, thing.getId());
        } else {
            console.error('Unexpected type for Movable.');
        }
    }*/

    private emitCreateUpdateGroupEvent(client: ExSocketInterface, group: Group): void {
        const position = group.getPosition();
        const pointMessage = new PointMessage();
        pointMessage.setX(Math.floor(position.x));
        pointMessage.setY(Math.floor(position.y));
        const groupUpdateMessage = new GroupUpdateMessage();
        groupUpdateMessage.setGroupid(group.getId());
        groupUpdateMessage.setPosition(pointMessage);
        groupUpdateMessage.setGroupsize(group.getSize);

        const subMessage = new SubMessage();
        subMessage.setGroupupdatemessage(groupUpdateMessage);

        emitInBatch(client, subMessage);
        //socket.emit(SocketIoEvent.GROUP_CREATE_UPDATE, groupUpdateMessage.serializeBinary().buffer);
    }

    private emitDeleteGroupEvent(client: ExSocketInterface, groupId: number): void {
        const groupDeleteMessage = new GroupDeleteMessage();
        groupDeleteMessage.setGroupid(groupId);

        const subMessage = new SubMessage();
        subMessage.setGroupdeletemessage(groupDeleteMessage);

        emitInBatch(client, subMessage);
    }

    private emitUserLeftEvent(client: ExSocketInterface, userId: number): void {
        const userLeftMessage = new UserLeftMessage();
        userLeftMessage.setUserid(userId);

        const subMessage = new SubMessage();
        subMessage.setUserleftmessage(userLeftMessage);

        emitInBatch(client, subMessage);
    }

    private joinWebRtcRoom(user: User, group: Group) {
        /*const roomId: string = "webrtcroom"+group.getId();
        if (user.socket.webRtcRoomId === roomId) {
            return;
        }*/

        for (const otherUser of group.getUsers()) {
            if (user === otherUser) {
                continue;
            }

            // Let's send 2 messages: one to the user joining the group and one to the other user
            const webrtcStartMessage1 = new WebRtcStartMessage();
            webrtcStartMessage1.setUserid(otherUser.id);
            webrtcStartMessage1.setName(otherUser.socket.name);
            webrtcStartMessage1.setInitiator(true);

            const serverToClientMessage1 = new ServerToClientMessage();
            serverToClientMessage1.setWebrtcstartmessage(webrtcStartMessage1);

            if (!user.socket.disconnecting) {
                user.socket.send(serverToClientMessage1.serializeBinary().buffer, true);
                //console.log('Sending webrtcstart initiator to '+user.socket.userId)
            }

            const webrtcStartMessage2 = new WebRtcStartMessage();
            webrtcStartMessage2.setUserid(user.id);
            webrtcStartMessage2.setName(user.socket.name);
            webrtcStartMessage2.setInitiator(false);

            const serverToClientMessage2 = new ServerToClientMessage();
            serverToClientMessage2.setWebrtcstartmessage(webrtcStartMessage2);

            if (!otherUser.socket.disconnecting) {
                otherUser.socket.send(serverToClientMessage2.serializeBinary().buffer, true);
                //console.log('Sending webrtcstart to '+otherUser.socket.userId)
            }

        }
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

            if (!otherUser.socket.disconnecting) {
                otherUser.socket.send(serverToClientMessage1.serializeBinary().buffer, true);
            }


            const webrtcDisconnectMessage2 = new WebRtcDisconnectMessage();
            webrtcDisconnectMessage2.setUserid(otherUser.id);

            const serverToClientMessage2 = new ServerToClientMessage();
            serverToClientMessage2.setWebrtcdisconnectmessage(webrtcDisconnectMessage2);

            if (!user.socket.disconnecting) {
                user.socket.send(serverToClientMessage2.serializeBinary().buffer, true);
            }
        }
    }

    emitPlayGlobalMessage(client: ExSocketInterface, playglobalmessage: PlayGlobalMessage) {
        const pusherToBackMessage = new PusherToBackMessage();
        pusherToBackMessage.setPlayglobalmessage(playglobalmessage);

        client.backConnection.write(pusherToBackMessage);
    }

    public getWorlds(): Map<string, PusherRoom> {
        return this.Worlds;
    }

    /**
     *
     * @param token
     */
    searchClientByUuid(uuid: string): ExSocketInterface | null {
        for(const socket of this.sockets.values()){
            if(socket.userUuid === uuid){
                return socket;
            }
        }
        return null;
    }


    public handleQueryJitsiJwtMessage(client: ExSocketInterface, queryJitsiJwtMessage: QueryJitsiJwtMessage) {
        const room = queryJitsiJwtMessage.getJitsiroom();
        const tag = queryJitsiJwtMessage.getTag(); // FIXME: this is not secure. We should load the JSON for the current room and check rights associated to room instead.

        if (SECRET_JITSI_KEY === '') {
            throw new Error('You must set the SECRET_JITSI_KEY key to the secret to generate JWT tokens for Jitsi.');
        }

        // Let's see if the current client has
        const isAdmin = client.tags.includes(tag);

        const jwt = Jwt.sign({
            "aud": "jitsi",
            "iss": JITSI_ISS,
            "sub": JITSI_URL,
            "room": room,
            "moderator": isAdmin
        }, SECRET_JITSI_KEY, {
            expiresIn: '1d',
            algorithm: "HS256",
            header:
                {
                    "alg": "HS256",
                    "typ": "JWT"
                }
        });

        const sendJitsiJwtMessage = new SendJitsiJwtMessage();
        sendJitsiJwtMessage.setJitsiroom(room);
        sendJitsiJwtMessage.setJwt(jwt);

        const serverToClientMessage = new ServerToClientMessage();
        serverToClientMessage.setSendjitsijwtmessage(sendJitsiJwtMessage);

        client.send(serverToClientMessage.serializeBinary().buffer, true);
    }

    public emitSendUserMessage(messageToSend: {userUuid: string, message: string, type: string}): ExSocketInterface {
        const socket = this.searchClientByUuid(messageToSend.userUuid);
        if(!socket){
            throw 'socket was not found';
        }

        const sendUserMessage = new SendUserMessage();
        sendUserMessage.setMessage(messageToSend.message);
        sendUserMessage.setType(messageToSend.type);

        const serverToClientMessage = new ServerToClientMessage();
        serverToClientMessage.setSendusermessage(sendUserMessage);

        if (!socket.disconnecting) {
            socket.send(serverToClientMessage.serializeBinary().buffer, true);
        }
        return socket;
    }

    /**
     * Merges the characterLayers received from the front (as an array of string) with the custom textures from the back.
     */
    static mergeCharacterLayersAndCustomTextures(characterLayers: string[], memberTextures: CharacterTexture[]): CharacterLayer[] {
        const characterLayerObjs: CharacterLayer[] = [];
        for (const characterLayer of characterLayers) {
            if (characterLayer.startsWith('customCharacterTexture')) {
                const customCharacterLayerId: number = +characterLayer.substr(22);
                for (const memberTexture of memberTextures) {
                    if (memberTexture.id == customCharacterLayerId) {
                        characterLayerObjs.push({
                            name: characterLayer,
                            url: memberTexture.url
                        })
                        break;
                    }
                }
            } else {
                characterLayerObjs.push({
                    name: characterLayer,
                    url: undefined
                })
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
}

export const socketManager = new SocketManager();
