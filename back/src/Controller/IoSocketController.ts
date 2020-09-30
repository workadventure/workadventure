import * as http from "http";
import {MessageUserPosition, Point} from "../Model/Websocket/MessageUserPosition"; //TODO fix import by "_Model/.."
import {ExSocketInterface} from "../Model/Websocket/ExSocketInterface"; //TODO fix import by "_Model/.."
import Jwt, {JsonWebTokenError} from "jsonwebtoken";
import {SECRET_KEY, MINIMUM_DISTANCE, GROUP_RADIUS, ALLOW_ARTILLERY} from "../Enum/EnvironmentVariable"; //TODO fix import by "_Enum/..."
import {World} from "../Model/World";
import {Group} from "../Model/Group";
import {User} from "../Model/User";
import {isSetPlayerDetailsMessage,} from "../Model/Websocket/SetPlayerDetailsMessage";
import {MessageUserJoined} from "../Model/Websocket/MessageUserJoined";
import si from "systeminformation";
import {Gauge} from "prom-client";
import {TokenInterface} from "../Controller/AuthenticateController";
import {isJoinRoomMessageInterface} from "../Model/Websocket/JoinRoomMessage";
import {PointInterface} from "../Model/Websocket/PointInterface";
import {isWebRtcSignalMessageInterface} from "../Model/Websocket/WebRtcSignalMessage";
import {UserInGroupInterface} from "../Model/Websocket/UserInGroupInterface";
import {isItemEventMessageInterface} from "../Model/Websocket/ItemEventMessage";
import {uuid} from 'uuidv4';
import {GroupUpdateInterface} from "_Model/Websocket/GroupUpdateInterface";
import {Movable} from "../Model/Movable";
import {
    PositionMessage,
    SetPlayerDetailsMessage,
    SubMessage,
    UserMovedMessage,
    BatchMessage,
    GroupUpdateMessage,
    PointMessage,
    GroupDeleteMessage,
    UserJoinedMessage,
    UserLeftMessage,
    ItemEventMessage,
    ViewportMessage,
    ClientToServerMessage,
    JoinRoomMessage,
    ErrorMessage,
    RoomJoinedMessage,
    ItemStateMessage,
    ServerToClientMessage,
    SetUserIdMessage,
    SilentMessage,
    WebRtcSignalToClientMessage,
    WebRtcSignalToServerMessage,
    WebRtcStartMessage, WebRtcDisconnectMessage
} from "../Messages/generated/messages_pb";
import {UserMovesMessage} from "../Messages/generated/messages_pb";
import Direction = PositionMessage.Direction;
import {ProtobufUtils} from "../Model/Websocket/ProtobufUtils";
import {App, HttpRequest, TemplatedApp, WebSocket} from "uWebSockets.js"
import {parse} from "query-string";
import {cpuTracker} from "../Services/CpuTracker";

function emitInBatch(socket: ExSocketInterface, payload: SubMessage): void {
    socket.batchedMessages.addPayload(payload);

    if (socket.batchTimeout === null) {
        socket.batchTimeout = setTimeout(() => {
            if (socket.disconnecting) {
                return;
            }

            const serverToClientMessage = new ServerToClientMessage();
            serverToClientMessage.setBatchmessage(socket.batchedMessages);

            socket.send(serverToClientMessage.serializeBinary().buffer, true);
            socket.batchedMessages = new BatchMessage();
            socket.batchTimeout = null;
        }, 100);
    }
}

export class IoSocketController {
    private Worlds: Map<string, World> = new Map<string, World>();
    private sockets: Map<number, ExSocketInterface> = new Map<number, ExSocketInterface>();
    private nbClientsGauge: Gauge<string>;
    private nbClientsPerRoomGauge: Gauge<string>;
    private nextUserId: number = 1;

    constructor(private readonly app: TemplatedApp) {

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

        this.ioConnection();
    }

    private isValidToken(token: object): token is TokenInterface {
        if (typeof((token as TokenInterface).userUuid) !== 'string') {
            return false;
        }
        return true;
    }

    /**
     *
     * @param token
     */
/*    searchClientByToken(token: string): ExSocketInterface | null {
        const clients: ExSocketInterface[] = Object.values(this.Io.sockets.sockets) as ExSocketInterface[];
        for (let i = 0; i < clients.length; i++) {
            const client = clients[i];
            if (client.token !== token) {
                continue
            }
            return client;
        }
        return null;
    }*/

    private async authenticate(req: HttpRequest): Promise<{ token: string, userUuid: string }> {
        //console.log(socket.handshake.query.token);

        const query = parse(req.getQuery());

        if (!query.token) {
            throw new Error('An authentication error happened, a user tried to connect without a token.');
        }

        const token = query.token;
        if (typeof(token) !== "string") {
            throw new Error('Token is expected to be a string');
        }


        if(token === 'test') {
            if (ALLOW_ARTILLERY) {
                return {
                    token,
                    userUuid: uuid()
                }
            } else {
                throw new Error("In order to perform a load-testing test on this environment, you must set the ALLOW_ARTILLERY environment variable to 'true'");
            }
        }

        /*if(this.searchClientByToken(socket.handshake.query.token)){
            console.error('An authentication error happened, a user tried to connect while its token is already connected.');
            return next(new Error('Authentication error'));
        }*/

        const promise = new Promise<{ token: string, userUuid: string }>((resolve, reject) => {
            Jwt.verify(token, SECRET_KEY, (err: JsonWebTokenError, tokenDecoded: object) => {
                const tokenInterface = tokenDecoded as TokenInterface;
                if (err) {
                    console.error('An authentication error happened, invalid JsonWebToken.', err);
                    reject(new Error('An authentication error happened, invalid JsonWebToken. '+err.message));
                    return;
                }

                if (!this.isValidToken(tokenInterface)) {
                    reject(new Error('Authentication error, invalid token structure.'));
                    return;
                }

                resolve({
                    token,
                    userUuid: tokenInterface.userUuid
                });
            });
        });

        return promise;
    }

    ioConnection() {
        this.app.ws('/*', {

            /* Options */
            //compression: uWS.SHARED_COMPRESSOR,
            maxPayloadLength: 16 * 1024 * 1024,
            maxBackpressure: 65536, // Maximum 64kB of data in the buffer.
            //idleTimeout: 10,
            upgrade: (res, req, context) => {
                //console.log('An Http connection wants to become WebSocket, URL: ' + req.getUrl() + '!');
                (async () => {

                    /* Keep track of abortions */
                    const upgradeAborted = {aborted: false};

                    res.onAborted(() => {
                        /* We can simply signal that we were aborted */
                        upgradeAborted.aborted = true;
                    });

                    try {
                        const result = await this.authenticate(req);

                        if (upgradeAborted.aborted) {
                            console.log("Ouch! Client disconnected before we could upgrade it!");
                            /* You must not upgrade now */
                            return;
                        }

                        /* This immediately calls open handler, you must not use res after this call */
                        res.upgrade({
                                // Data passed here is accessible on the "websocket" socket object.
                                url: req.getUrl(),
                                token: result.token,
                                userUuid: result.userUuid
                            },
                            /* Spell these correctly */
                            req.getHeader('sec-websocket-key'),
                            req.getHeader('sec-websocket-protocol'),
                            req.getHeader('sec-websocket-extensions'),
                            context);

                    } catch (e) {
                        if (e instanceof Error) {
                            console.warn(e.message);
                            res.writeStatus("401 Unauthorized").end(e.message);
                        } else {
                            console.warn(e);
                            res.writeStatus("500 Internal Server Error").end('An error occurred');
                        }
                        return;
                    }
                })();
            },
            /* Handlers */
            open: (ws) => {
                const client : ExSocketInterface = ws as ExSocketInterface;
                client.userId = this.nextUserId;
                this.nextUserId++;
                client.userUuid = ws.userUuid;
                client.token = ws.token;
                client.batchedMessages = new BatchMessage();
                client.batchTimeout = null;
                client.emitInBatch = (payload: SubMessage): void => {
                    emitInBatch(client, payload);
                }
                client.disconnecting = false;
                this.sockets.set(client.userId, client);

                // Let's log server load when a user joins
                this.nbClientsGauge.inc();
                console.log(new Date().toISOString() + ' A user joined (', this.sockets.size, ' connected users)');

            },
            message: (ws, arrayBuffer, isBinary) => {
                const client = ws as ExSocketInterface;
                const message = ClientToServerMessage.deserializeBinary(new Uint8Array(arrayBuffer));

                if (message.hasJoinroommessage()) {
                    this.handleJoinRoom(client, message.getJoinroommessage() as JoinRoomMessage);
                } else if (message.hasViewportmessage()) {
                    this.handleViewport(client, message.getViewportmessage() as ViewportMessage);
                } else if (message.hasUsermovesmessage()) {
                    this.handleUserMovesMessage(client, message.getUsermovesmessage() as UserMovesMessage);
                } else if (message.hasSetplayerdetailsmessage()) {
                    this.handleSetPlayerDetails(client, message.getSetplayerdetailsmessage() as SetPlayerDetailsMessage);
                } else if (message.hasSilentmessage()) {
                    this.handleSilentMessage(client, message.getSilentmessage() as SilentMessage);
                } else if (message.hasItemeventmessage()) {
                    this.handleItemEvent(client, message.getItemeventmessage() as ItemEventMessage);
                } else if (message.hasWebrtcsignaltoservermessage()) {
                    this.emitVideo(client, message.getWebrtcsignaltoservermessage() as WebRtcSignalToServerMessage)
                } else if (message.hasWebrtcscreensharingsignaltoservermessage()) {
                    this.emitScreenSharing(client, message.getWebrtcscreensharingsignaltoservermessage() as WebRtcSignalToServerMessage)
                }

                    /* Ok is false if backpressure was built up, wait for drain */
                //let ok = ws.send(message, isBinary);
            },
            drain: (ws) => {
                console.log('WebSocket backpressure: ' + ws.getBufferedAmount());
            },
            close: (ws, code, message) => {
                const Client = (ws as ExSocketInterface);
                try {
                    Client.disconnecting = true;
                    //leave room
                    this.leaveRoom(Client);

                    //delete all socket information
                    /*delete Client.roomId;
                    delete Client.token;
                    delete Client.position;*/
                } catch (e) {
                    console.error('An error occurred on "disconnect"');
                    console.error(e);
                }

                this.sockets.delete(Client.userId);

                // Let's log server load when a user leaves
                this.nbClientsGauge.dec();
                console.log('A user left (', this.sockets.size, ' connected users)');
            }
        })

        // TODO: finish this!
        /*this.Io.on(SocketIoEvent.CONNECTION, (socket: Socket) => {



            socket.on(SocketIoEvent.WEBRTC_SIGNAL, (data: unknown) => {
                this.emitVideo((socket as ExSocketInterface), data);
            });

            socket.on(SocketIoEvent.WEBRTC_SCREEN_SHARING_SIGNAL, (data: unknown) => {
                this.emitScreenSharing((socket as ExSocketInterface), data);
            });

        });*/
    }

    private emitError(Client: ExSocketInterface, message: string): void {
        const errorMessage = new ErrorMessage();
        errorMessage.setMessage(message);

        const serverToClientMessage = new ServerToClientMessage();
        serverToClientMessage.setErrormessage(errorMessage);

        if (!Client.disconnecting) {
            Client.send(serverToClientMessage.serializeBinary().buffer, true);
        }
        console.warn(message);
    }

    private handleJoinRoom(Client: ExSocketInterface, message: JoinRoomMessage): void {
        try {
            /*if (!isJoinRoomMessageInterface(message.toObject())) {
                console.log(message.toObject())
                this.emitError(Client, 'Invalid JOIN_ROOM message received: ' + message.toObject().toString());
                return;
            }*/
            const roomId = message.getRoomid();

            if (Client.roomId === roomId) {
                return;
            }

            //leave previous room
            //this.leaveRoom(Client); // Useless now, there is only one room per connection

            //join new previous room
            const world = this.joinRoom(Client, roomId, ProtobufUtils.toPointInterface(message.getPosition() as PositionMessage));

            const things = world.setViewport(Client, (message.getViewport() as ViewportMessage).toObject());

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

            for (const [itemId, item] of world.getItemsState().entries()) {
                const itemStateMessage = new ItemStateMessage();
                itemStateMessage.setItemid(itemId);
                itemStateMessage.setStatejson(JSON.stringify(item));

                roomJoinedMessage.addItem(itemStateMessage);
            }

            const serverToClientMessage = new ServerToClientMessage();
            serverToClientMessage.setRoomjoinedmessage(roomJoinedMessage);

            if (!Client.disconnecting) {
                Client.send(serverToClientMessage.serializeBinary().buffer, true);
            }
        } catch (e) {
            console.error('An error occurred on "join_room" event');
            console.error(e);
        }
    }

    private handleViewport(client: ExSocketInterface, viewportMessage: ViewportMessage) {
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

    private handleUserMovesMessage(client: ExSocketInterface, userMovesMessage: UserMovesMessage) {
        //console.log(SockerIoEvent.USER_POSITION, userMovesMessage);
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

    private handleSetPlayerDetails(client: ExSocketInterface, playerDetailsMessage: SetPlayerDetailsMessage) {
        const playerDetails = {
            name: playerDetailsMessage.getName(),
            characterLayers: playerDetailsMessage.getCharacterlayersList()
        };
        //console.log(SocketIoEvent.SET_PLAYER_DETAILS, playerDetails);
        if (!isSetPlayerDetailsMessage(playerDetails)) {
            this.emitError(client, 'Invalid SET_PLAYER_DETAILS message received: ');
            return;
        }
        client.name = playerDetails.name;
        client.characterLayers = playerDetails.characterLayers;


        const setUserIdMessage = new SetUserIdMessage();
        setUserIdMessage.setUserid(client.userId);

        const serverToClientMessage = new ServerToClientMessage();
        serverToClientMessage.setSetuseridmessage(setUserIdMessage);

        if (!client.disconnecting) {
            client.send(serverToClientMessage.serializeBinary().buffer, true);
        }
    }

    private handleSilentMessage(client: ExSocketInterface, silentMessage: SilentMessage) {
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

    private handleItemEvent(ws: ExSocketInterface, itemEventMessage: ItemEventMessage) {
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

    searchClientByIdOrFail(userId: number): ExSocketInterface {
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
                const world: World | undefined = this.Worlds.get(Client.roomId);
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
            }
        }
    }

    private joinRoom(Client : ExSocketInterface, roomId: string, position: PointInterface): World {
        //join user in room
        //Client.join(roomId);
        this.nbClientsPerRoomGauge.inc({ room: roomId });
        Client.roomId = roomId;
        Client.position = position;

        //check and create new world for a room
        let world = this.Worlds.get(roomId)
        if(world === undefined){
            world = new World((user1: User, group: Group) => {
                this.joinWebRtcRoom(user1, group);
            }, (user1: User, group: Group) => {
                this.disConnectedUser(user1, group);
            }, MINIMUM_DISTANCE, GROUP_RADIUS, (thing: Movable, listener: User) => {
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
            }, (thing: Movable, position, listener) => {
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
            }, (thing: Movable, listener) => {
                const clientListener = this.searchClientByIdOrFail(listener.id);
                if (thing instanceof User) {
                    const clientUser = this.searchClientByIdOrFail(thing.id);
                    this.emitUserLeftEvent(clientListener, clientUser.userId);
                } else if (thing instanceof Group) {
                    this.emitDeleteGroupEvent(clientListener, thing.getId());
                } else {
                    console.error('Unexpected type for Movable.');
                }

            });
            this.Worlds.set(roomId, world);
        }

        // Dispatch groups position to newly connected user
        world.getGroups().forEach((group: Group) => {
            this.emitCreateUpdateGroupEvent(Client, group);
        });
        //join world
        world.join(Client, Client.position);
        return world;
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

    joinWebRtcRoom(user: User, group: Group) {
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

/*        socket.join(roomId);
        socket.webRtcRoomId = roomId;
        //if two persons in room share
        if (this.Io.sockets.adapter.rooms[roomId].length < 2) {
            return;
        }

        // TODO: scanning all sockets is maybe not the most efficient
        const clients: Array<ExSocketInterface> = (Object.values(this.Io.sockets.sockets) as Array<ExSocketInterface>)
            .filter((client: ExSocketInterface) => client.webRtcRoomId && client.webRtcRoomId === roomId);
        //send start at one client to initialise offer webrtc
        //send all users in room to create PeerConnection in front
        clients.forEach((client: ExSocketInterface, index: number) => {

            const peerClients = clients.reduce((tabs: Array<UserInGroupInterface>, clientId: ExSocketInterface, indexClientId: number) => {
                if (!clientId.userId || clientId.userId === client.userId) {
                    return tabs;
                }
                tabs.push({
                    userId: clientId.userId,
                    name: clientId.name,
                    initiator: index <= indexClientId
                });
                return tabs;
            }, []);

            client.emit(SocketIoEvent.WEBRTC_START, {clients: peerClients, roomId: roomId});
        });*/
    }

    /** permit to share user position
     ** users position will send in event 'user-position'
     ** The data sent is an array with information for each user :
     [
     {
            userId: <string>,
            roomId: <string>,
            position: {
                x : <number>,
                y : <number>,
               direction: <string>
            }
          },
     ...
     ]
     **/

    //disconnect user
    disConnectedUser(user: User, group: Group) {

        const Client = user.socket;

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

        //disconnect webrtc room
        /*if(!Client.webRtcRoomId){
            return;
        }*/
        //Client.leave(Client.webRtcRoomId);
        //delete Client.webRtcRoomId;
    }

    public getWorlds(): Map<string, World> {
        return this.Worlds;
    }

}
