import {GameRoom} from "../Model/GameRoom";
import {ExSocketInterface} from "../Model/Websocket/ExSocketInterface";
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
    WebRtcSignalToServerMessage, WebRtcStartMessage, QueryJitsiJwtMessage, SendJitsiJwtMessage
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
import {adminApi} from "./AdminApi";
import Direction = PositionMessage.Direction;
import {Gauge} from "prom-client";
import {emitError, emitInBatch} from "./IoSocketHelpers";
import Jwt from "jsonwebtoken";
import {JITSI_URL} from "../Enum/EnvironmentVariable";

class SocketManager {
    private Worlds: Map<string, GameRoom> = new Map<string, GameRoom>();
    private sockets: Map<number, ExSocketInterface> = new Map<number, ExSocketInterface>();
    private nbClientsGauge: Gauge<string>;
    private nbClientsPerRoomGauge: Gauge<string>;

    constructor() {
        this.nbClientsGauge = new Gauge({
            name: 'workadventure_nb_sockets',
            help: 'Number of connected sockets',
            labelNames: [ ]
        });
        this.nbClientsPerRoomGauge = new Gauge({
            name: 'workadventure_nb_clients_per_room',
            help: 'Number of clients per room',
            labelNames: [ 'room' ]
        });
    }

    handleJoinRoom(client: ExSocketInterface): void {
        const position = client.position;
        const viewport = client.viewport;
        try {
            this.sockets.set(client.userId, client); //todo: should this be at the end of the function?
            this.nbClientsGauge.inc();
            // Let's log server load when a user joins
            console.log(new Date().toISOString() + ' A user joined (', socketManager.sockets.size, ' connected users)');

            //join new previous room
            const gameRoom = this.joinRoom(client, position);

            const things = gameRoom.setViewport(client, viewport);

            const roomJoinedMessage = new RoomJoinedMessage();

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
                    userJoinedMessage.setCharacterlayersList(player.characterLayers);
                    userJoinedMessage.setPosition(ProtobufUtils.toPositionMessage(player.position));

                    roomJoinedMessage.addUser(userJoinedMessage);
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
            }
        } catch (e) {
            console.error('An error occurred on "join_room" event');
            console.error(e);
        }
    }

    handleViewport(client: ExSocketInterface, viewportMessage: ViewportMessage) {
        try {
            const viewport = viewportMessage.toObject();

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
        try {
            const userMoves = userMovesMessage.toObject();

            // If CPU is high, let's drop messages of users moving (we will only dispatch the final position)
            if (cpuTracker.isOverHeating() && userMoves.position?.moving === true) {
                return;
            }

            const position = userMoves.position;
            if (position === undefined) {
                throw new Error('Position not found in message');
            }
            const viewport = userMoves.viewport;
            if (viewport === undefined) {
                throw new Error('Viewport not found in message');
            }

            let direction: string;
            switch (position.direction) {
                case Direction.UP:
                    direction = 'up';
                    break;
                case Direction.DOWN:
                    direction = 'down';
                    break;
                case Direction.LEFT:
                    direction = 'left';
                    break;
                case Direction.RIGHT:
                    direction = 'right';
                    break;
                default:
                    throw new Error("Unexpected direction");
            }

            // sending to all clients in room except sender
            client.position = {
                x: position.x,
                y: position.y,
                direction,
                moving: position.moving,
            };
            client.viewport = viewport;

            // update position in the world
            const world = this.Worlds.get(client.roomId);
            if (!world) {
                console.error("In USER_POSITION, could not find world with id '", client.roomId, "'");
                return;
            }
            world.updatePosition(client, client.position);
            world.setViewport(client, client.viewport);
        } catch (e) {
            console.error('An error occurred on "user_position" event');
            console.error(e);
        }
    }

    // Useless now, will be useful again if we allow editing details in game
    handleSetPlayerDetails(client: ExSocketInterface, playerDetailsMessage: SetPlayerDetailsMessage) {
        const playerDetails = {
            name: playerDetailsMessage.getName(),
            characterLayers: playerDetailsMessage.getCharacterlayersList()
        };
        //console.log(SocketIoEvent.SET_PLAYER_DETAILS, playerDetails);
        if (!isSetPlayerDetailsMessage(playerDetails)) {
            emitError(client, 'Invalid SET_PLAYER_DETAILS message received: ');
            return;
        }
        client.name = playerDetails.name;
        client.characterLayers = playerDetails.characterLayers;

    }

    handleSilentMessage(client: ExSocketInterface, silentMessage: SilentMessage) {
        try {
            // update position in the world
            const world = this.Worlds.get(client.roomId);
            if (!world) {
                console.error("In handleSilentMessage, could not find world with id '", client.roomId, "'");
                return;
            }
            world.setSilent(client, silentMessage.getSilent());
        } catch (e) {
            console.error('An error occurred on "handleSilentMessage"');
            console.error(e);
        }
    }

    handleItemEvent(ws: ExSocketInterface, itemEventMessage: ItemEventMessage) {
        const itemEvent = ProtobufUtils.toItemEvent(itemEventMessage);

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
        }
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
        //send only at user
        const client = this.sockets.get(data.getReceiverid());
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
        }
    }

    emitScreenSharing(socket: ExSocketInterface, data: WebRtcSignalToServerMessage): void {
        //send only at user
        const client = this.sockets.get(data.getReceiverid());
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
        }
    }

    private searchClientByIdOrFail(userId: number): ExSocketInterface {
        const client: ExSocketInterface|undefined = this.sockets.get(userId);
        if (client === undefined) {
            throw new Error("Could not find user with id " + userId);
        }
        return client;
    }

    leaveRoom(Client : ExSocketInterface){
        // leave previous room and world
        if(Client.roomId){
            try {
                //user leave previous world
                const world: GameRoom | undefined = this.Worlds.get(Client.roomId);
                if (world) {
                    world.leave(Client);
                    if (world.isEmpty()) {
                        this.Worlds.delete(Client.roomId);
                    }
                }
                //user leave previous room
                //Client.leave(Client.roomId);
            } finally {
                this.nbClientsPerRoomGauge.dec({ room: Client.roomId });
                //delete Client.roomId;
                this.sockets.delete(Client.userId);
                // Let's log server load when a user leaves
                this.nbClientsGauge.dec();
                console.log('A user left (', this.sockets.size, ' connected users)');
            }
        }
    }

    async getOrCreateRoom(roomId: string): Promise<GameRoom> {
        //check and create new world for a room
        let world = this.Worlds.get(roomId)
        if(world === undefined){
            world = new GameRoom(
                roomId,
                (user: User, group: Group) => this.joinWebRtcRoom(user, group),
                (user: User, group: Group) => this.disConnectedUser(user, group),
                MINIMUM_DISTANCE,
                GROUP_RADIUS,
                (thing: Movable, listener: User) => this.onRoomEnter(thing, listener),
                (thing: Movable, position:PositionInterface, listener:User) => this.onClientMove(thing, position, listener),
                (thing: Movable, listener:User) => this.onClientLeave(thing, listener)
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

    private joinRoom(client : ExSocketInterface, position: PointInterface): GameRoom {

        const roomId = client.roomId;
        //join user in room
        this.nbClientsPerRoomGauge.inc({ room: roomId });
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
        return world;
    }

    private onRoomEnter(thing: Movable, listener: User) {
        const clientListener = this.searchClientByIdOrFail(listener.id);
        if (thing instanceof User) {
            const clientUser = this.searchClientByIdOrFail(thing.id);

            const userJoinedMessage = new UserJoinedMessage();
            if (!Number.isInteger(clientUser.userId)) {
                throw new Error('clientUser.userId is not an integer '+clientUser.userId);
            }
            userJoinedMessage.setUserid(clientUser.userId);
            userJoinedMessage.setName(clientUser.name);
            userJoinedMessage.setCharacterlayersList(clientUser.characterLayers);
            userJoinedMessage.setPosition(ProtobufUtils.toPositionMessage(clientUser.position));

            const subMessage = new SubMessage();
            subMessage.setUserjoinedmessage(userJoinedMessage);

            emitInBatch(clientListener, subMessage);
        } else if (thing instanceof Group) {
            this.emitCreateUpdateGroupEvent(clientListener, thing);
        } else {
            console.error('Unexpected type for Movable.');
        }
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
    }

    private emitCreateUpdateGroupEvent(client: ExSocketInterface, group: Group): void {
        const position = group.getPosition();
        const pointMessage = new PointMessage();
        pointMessage.setX(Math.floor(position.x));
        pointMessage.setY(Math.floor(position.y));
        const groupUpdateMessage = new GroupUpdateMessage();
        groupUpdateMessage.setGroupid(group.getId());
        groupUpdateMessage.setPosition(pointMessage);

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
        try {
            const world = this.Worlds.get(client.roomId);
            if (!world) {
                console.error("In emitPlayGlobalMessage, could not find world with id '", client.roomId, "'");
                return;
            }

            const serverToClientMessage = new ServerToClientMessage();
            serverToClientMessage.setPlayglobalmessage(playglobalmessage);

            for (const [id, user] of world.getUsers().entries()) {
                user.socket.send(serverToClientMessage.serializeBinary().buffer, true);
            }
        } catch (e) {
            console.error('An error occurred on "emitPlayGlobalMessage" event');
            console.error(e);
        }

    }

    public getWorlds(): Map<string, GameRoom> {
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
}

export const socketManager = new SocketManager();
