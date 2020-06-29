import socketIO = require('socket.io');
import {Socket} from "socket.io";
import * as http from "http";
import {MessageUserPosition, Point} from "../Model/Websocket/MessageUserPosition"; //TODO fix import by "_Model/.."
import {ExSocketInterface} from "../Model/Websocket/ExSocketInterface"; //TODO fix import by "_Model/.."
import Jwt, {JsonWebTokenError} from "jsonwebtoken";
import {SECRET_KEY, MINIMUM_DISTANCE, GROUP_RADIUS} from "../Enum/EnvironmentVariable"; //TODO fix import by "_Enum/..."
import {World} from "../Model/World";
import {Group} from "_Model/Group";
import {UserInterface} from "_Model/UserInterface";
import {isSetPlayerDetailsMessage,} from "../Model/Websocket/SetPlayerDetailsMessage";
import {MessageUserJoined} from "../Model/Websocket/MessageUserJoined";
import {MessageUserMoved} from "../Model/Websocket/MessageUserMoved";
import si from "systeminformation";
import {Gauge} from "prom-client";
import os from 'os';
import {TokenInterface} from "../Controller/AuthenticateController";
import {isJoinRoomMessageInterface} from "../Model/Websocket/JoinRoomMessage";
import {isPointInterface, PointInterface} from "../Model/Websocket/PointInterface";
import {isWebRtcSignalMessageInterface} from "../Model/Websocket/WebRtcSignalMessage";
import {UserInGroupInterface} from "../Model/Websocket/UserInGroupInterface";

enum SockerIoEvent {
    CONNECTION = "connection",
    DISCONNECT = "disconnect",
    JOIN_ROOM = "join-room", // bi-directional
    USER_POSITION = "user-position", // bi-directional
    USER_MOVED = "user-moved", // From server to client
    USER_LEFT = "user-left", // From server to client
    WEBRTC_SIGNAL = "webrtc-signal",
    WEBRTC_START = "webrtc-start",
    WEBRTC_DISCONNECT = "webrtc-disconect",
    MESSAGE_ERROR = "message-error",
    GROUP_CREATE_UPDATE = "group-create-update",
    GROUP_DELETE = "group-delete",
    SET_PLAYER_DETAILS = "set-player-details"
}

export class IoSocketController {
    public readonly Io: socketIO.Server;
    private Worlds: Map<string, World> = new Map<string, World>();
    private sockets: Map<string, ExSocketInterface> = new Map<string, ExSocketInterface>();
    private nbClientsGauge: Gauge<string>;
    private nbClientsPerRoomGauge: Gauge<string>;

    constructor(server: http.Server) {
        this.Io = socketIO(server);
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

        // Authentication with token. it will be decoded and stored in the socket.
        // Completely commented for now, as we do not use the "/login" route at all.
        this.Io.use((socket: Socket, next) => {
            if (!socket.handshake.query || !socket.handshake.query.token) {
                console.error('An authentication error happened, a user tried to connect without a token.');
                return next(new Error('Authentication error'));
            }
            if(this.searchClientByToken(socket.handshake.query.token)){
                console.error('An authentication error happened, a user tried to connect while its token is already connected.');
                return next(new Error('Authentication error'));
            }
            Jwt.verify(socket.handshake.query.token, SECRET_KEY, (err: JsonWebTokenError, tokenDecoded: object) => {
                if (err) {
                    console.error('An authentication error happened, invalid JsonWebToken.', err);
                    return next(new Error('Authentication error'));
                }

                if (!this.isValidToken(tokenDecoded)) {
                    return next(new Error('Authentication error, invalid token structure'));
                }

                (socket as ExSocketInterface).token = socket.handshake.query.token;
                (socket as ExSocketInterface).userId = tokenDecoded.userId;
                next();
            });
        });

        this.ioConnection();
    }

    private isValidToken(token: object): token is TokenInterface {
        if (typeof((token as TokenInterface).userId) !== 'string') {
            return false;
        }
        if (typeof((token as TokenInterface).name) !== 'string') {
            return false;
        }
        return true;
    }

    /**
     *
     * @param token
     */
    searchClientByToken(token: string): ExSocketInterface | null {
        const clients: ExSocketInterface[] = Object.values(this.Io.sockets.sockets) as ExSocketInterface[];
        for (let i = 0; i < clients.length; i++) {
            const client = clients[i];
            if (client.token !== token) {
                continue
            }
            return client;
        }
        return null;
    }

    private sendUpdateGroupEvent(group: Group): void {
        // Let's get the room of the group. To do this, let's get anyone in the group and find its room.
        // Note: this is suboptimal
        const userId = group.getUsers()[0].id;
        const client: ExSocketInterface = this.searchClientByIdOrFail(userId);
        const roomId = client.roomId;
        this.Io.in(roomId).emit(SockerIoEvent.GROUP_CREATE_UPDATE, {
            position: group.getPosition(),
            groupId: group.getId()
        });
    }

    private sendDeleteGroupEvent(uuid: string, lastUser: UserInterface): void {
        // Let's get the room of the group. To do this, let's get anyone in the group and find its room.
        const userId = lastUser.id;
        const client: ExSocketInterface = this.searchClientByIdOrFail(userId);
        const roomId = client.roomId;
        this.Io.in(roomId).emit(SockerIoEvent.GROUP_DELETE, uuid);
    }

    ioConnection() {
        this.Io.on(SockerIoEvent.CONNECTION, (socket: Socket) => {
            const client : ExSocketInterface = socket as ExSocketInterface;
            this.sockets.set(client.userId, client);

            // Let's log server load when a user joins
            const srvSockets = this.Io.sockets.sockets;
            this.nbClientsGauge.inc();
            console.log(new Date().toISOString() + ' A user joined (', Object.keys(srvSockets).length, ' connected users)');
            si.currentLoad().then(data => console.log('  Current load: ', data.avgload));
            si.currentLoad().then(data => console.log('  CPU: ', data.currentload, '%'));
            // End log server load

            /*join-rom event permit to join one room.
                message :
                    userId : user identification
                    roomId: room identification
                    position: position of user in map
                        x: user x position on map
                        y: user y position on map
            */
            socket.on(SockerIoEvent.JOIN_ROOM, (message: unknown, answerFn): void => {
                try {
                    if (!isJoinRoomMessageInterface(message)) {
                        socket.emit(SockerIoEvent.MESSAGE_ERROR, {message: 'Invalid JOIN_ROOM message.'});
                        console.warn('Invalid JOIN_ROOM message received: ', message);
                        return;
                    }
                    const roomId = message.roomId;

                    const Client = (socket as ExSocketInterface);

                    if (Client.roomId === roomId) {
                        return;
                    }

                    //leave previous room
                    this.leaveRoom(Client);

                    //join new previous room
                    const world = this.joinRoom(Client, roomId, message.position);

                    //add function to refresh position user in real time.
                    //this.refreshUserPosition(Client);

                    const messageUserJoined = new MessageUserJoined(Client.userId, Client.name, Client.character, Client.position);

                    socket.to(roomId).emit(SockerIoEvent.JOIN_ROOM, messageUserJoined);

                    // The answer shall contain the list of all users of the room with their positions:
                    const listOfUsers = Array.from(world.getUsers(), ([key, user]) => {
                        const player: ExSocketInterface|undefined = this.sockets.get(user.id);
                        if (player === undefined) {
                            console.warn('Something went wrong. The World contains a user "'+user.id+"' but this user does not exist in the sockets list!");
                            return null;
                        }
                        return new MessageUserPosition(user.id, player.name, player.character, player.position);
                    }).filter((item: MessageUserPosition|null) => item !== null);
                    answerFn(listOfUsers);
                } catch (e) {
                    console.error('An error occurred on "join_room" event');
                    console.error(e);
                }
            });

            socket.on(SockerIoEvent.USER_POSITION, (position: unknown): void => {
                try {
                    if (!isPointInterface(position)) {
                        socket.emit(SockerIoEvent.MESSAGE_ERROR, {message: 'Invalid USER_POSITION message.'});
                        console.warn('Invalid USER_POSITION message received: ', position);
                        return;
                    }

                    const Client = (socket as ExSocketInterface);

                    // sending to all clients in room except sender
                    Client.position = position;

                    // update position in the world
                    const world = this.Worlds.get(Client.roomId);
                    if (!world) {
                        console.error("Could not find world with id '", Client.roomId, "'");
                        return;
                    }
                    world.updatePosition(Client, position);

                    socket.to(Client.roomId).emit(SockerIoEvent.USER_MOVED, new MessageUserMoved(Client.userId, Client.position));
                } catch (e) {
                    console.error('An error occurred on "user_position" event');
                    console.error(e);
                }
            });

            socket.on(SockerIoEvent.WEBRTC_SIGNAL, (data: unknown) => {
                if (!isWebRtcSignalMessageInterface(data)) {
                    socket.emit(SockerIoEvent.MESSAGE_ERROR, {message: 'Invalid WEBRTC_SIGNAL message.'});
                    console.warn('Invalid WEBRTC_SIGNAL message received: ', data);
                    return;
                }
                //send only at user
                const client = this.sockets.get(data.receiverId);
                if (client === undefined) {
                    console.warn("While exchanging a WebRTC signal: client with id ", data.receiverId, " does not exist. This might be a race condition.");
                    return;
                }
                return client.emit(SockerIoEvent.WEBRTC_SIGNAL, data);
            });

            socket.on(SockerIoEvent.DISCONNECT, () => {
                const Client = (socket as ExSocketInterface);
                try {
                    //leave room
                    this.leaveRoom(Client);

                    //leave webrtc room
                    //socket.leave(Client.webRtcRoomId);

                    //delete all socket information
                    delete Client.webRtcRoomId;
                    delete Client.roomId;
                    delete Client.token;
                    delete Client.position;
                } catch (e) {
                    console.error('An error occurred on "disconnect"');
                    console.error(e);
                }
                this.sockets.delete(Client.userId);

                // Let's log server load when a user leaves
                const srvSockets = this.Io.sockets.sockets;
                this.nbClientsGauge.dec();
                console.log('A user left (', Object.keys(srvSockets).length, ' connected users)');
                si.currentLoad().then(data => console.log('Current load: ', data.avgload));
                si.currentLoad().then(data => console.log('CPU: ', data.currentload, '%'));
                // End log server load
            });

            // Let's send the user id to the user
            socket.on(SockerIoEvent.SET_PLAYER_DETAILS, (playerDetails: unknown, answerFn) => {
                if (!isSetPlayerDetailsMessage(playerDetails)) {
                    socket.emit(SockerIoEvent.MESSAGE_ERROR, {message: 'Invalid SET_PLAYER_DETAILS message.'});
                    console.warn('Invalid SET_PLAYER_DETAILS message received: ', playerDetails);
                    return;
                }
                const Client = (socket as ExSocketInterface);
                Client.name = playerDetails.name;
                Client.character = playerDetails.character;
                answerFn(Client.userId);
            });
        });
    }

    searchClientByIdOrFail(userId: string): ExSocketInterface {
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
                Client.to(Client.roomId).emit(SockerIoEvent.USER_LEFT, Client.userId);

                //user leave previous world
                const world: World | undefined = this.Worlds.get(Client.roomId);
                if (world) {
                    world.leave(Client);
                    if (world.isEmpty()) {
                        this.Worlds.delete(Client.roomId);
                    }
                }
                //user leave previous room
                Client.leave(Client.roomId);
            } finally {
                this.nbClientsPerRoomGauge.dec({ room: Client.roomId });
                delete Client.roomId;
            }
        }
    }

    private joinRoom(Client : ExSocketInterface, roomId: string, position: PointInterface): World {
        //join user in room
        Client.join(roomId);
        this.nbClientsPerRoomGauge.inc({ room: roomId });
        Client.roomId = roomId;
        Client.position = position;

        //check and create new world for a room
        let world = this.Worlds.get(roomId)
        if(world === undefined){
            world = new World((user1: string, group: Group) => {
                this.connectedUser(user1, group);
            }, (user1: string, group: Group) => {
                this.disConnectedUser(user1, group);
            }, MINIMUM_DISTANCE, GROUP_RADIUS, (group: Group) => {
                this.sendUpdateGroupEvent(group);
            }, (groupUuid: string, lastUser: UserInterface) => {
                this.sendDeleteGroupEvent(groupUuid, lastUser);
            });
            this.Worlds.set(roomId, world);
        }

        // Dispatch groups position to newly connected user
        world.getGroups().forEach((group: Group) => {
            Client.emit(SockerIoEvent.GROUP_CREATE_UPDATE, {
                position: group.getPosition(),
                groupId: group.getId()
            });
        });
        //join world
        world.join(Client, Client.position);
        return world;
    }

    /**
     *
     * @param socket
     * @param roomId
     */
    joinWebRtcRoom(socket: ExSocketInterface, roomId: string) {
        if (socket.webRtcRoomId === roomId) {
            return;
        }
        socket.join(roomId);
        socket.webRtcRoomId = roomId;
        //if two persons in room share
        if (this.Io.sockets.adapter.rooms[roomId].length < 2 /*|| this.Io.sockets.adapter.rooms[roomId].length >= 4*/) {
            return;
        }
        const clients: Array<ExSocketInterface> = (Object.values(this.Io.sockets.sockets) as Array<ExSocketInterface>)
            .filter((client: ExSocketInterface) => client.webRtcRoomId && client.webRtcRoomId === roomId);
        //send start at one client to initialise offer webrtc
        //send all users in room to create PeerConnection in front
        clients.forEach((client: ExSocketInterface, index: number) => {

            const clientsId = clients.reduce((tabs: Array<UserInGroupInterface>, clientId: ExSocketInterface, indexClientId: number) => {
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

            client.emit(SockerIoEvent.WEBRTC_START, {clients: clientsId, roomId: roomId});
        });
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

    //connected user
    connectedUser(userId: string, group: Group) {
        /*let Client = this.sockets.get(userId);
        if (Client === undefined) {
            return;
        }*/
        const Client = this.searchClientByIdOrFail(userId);
        this.joinWebRtcRoom(Client, group.getId());
    }

    //disconnect user
    disConnectedUser(userId: string, group: Group) {
        const Client = this.searchClientByIdOrFail(userId);
        Client.to(group.getId()).emit(SockerIoEvent.WEBRTC_DISCONNECT, {
            userId: userId
        });

        // Most of the time, sending a disconnect event to one of the players is enough (the player will close the connection
        // which will be shut for the other player).
        // However! In the rare case where the WebRTC connection is not yet established, if we close the connection on one of the player,
        // the other player will try connecting until a timeout happens (during this time, the connection icon will be displayed for nothing).
        // So we also send the disconnect event to the other player.
        for (const user of group.getUsers()) {
            Client.emit(SockerIoEvent.WEBRTC_DISCONNECT, {
                userId: user.id
            });
        }

        //disconnect webrtc room
        if(!Client.webRtcRoomId){
            return;
        }
        Client.leave(Client.webRtcRoomId);
        delete Client.webRtcRoomId;
    }
}
