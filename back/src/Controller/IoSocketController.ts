import socketIO = require('socket.io');
import {Socket} from "socket.io";
import * as http from "http";
import {MessageUserPosition, Point} from "../Model/Websocket/MessageUserPosition"; //TODO fix import by "_Model/.."
import {ExSocketInterface} from "../Model/Websocket/ExSocketInterface"; //TODO fix import by "_Model/.."
import Jwt, {JsonWebTokenError} from "jsonwebtoken";
import {SECRET_KEY, MINIMUM_DISTANCE, GROUP_RADIUS} from "../Enum/EnvironmentVariable"; //TODO fix import by "_Enum/..."
import {ExtRooms, RefreshUserPositionFunction} from "../Model/Websocket/ExtRooms";
import {ExtRoomsInterface} from "../Model/Websocket/ExtRoomsInterface";
import {World} from "../Model/World";
import {Group} from "_Model/Group";
import {UserInterface} from "_Model/UserInterface";
import {SetPlayerDetailsMessage} from "_Model/Websocket/SetPlayerDetailsMessage";

enum SockerIoEvent {
    CONNECTION = "connection",
    DISCONNECT = "disconnect",
    JOIN_ROOM = "join-room",
    USER_POSITION = "user-position",
    WEBRTC_SIGNAL = "webrtc-signal",
    WEBRTC_OFFER = "webrtc-offer",
    WEBRTC_START = "webrtc-start",
    WEBRTC_DISCONNECT = "webrtc-disconect",
    MESSAGE_ERROR = "message-error",
    GROUP_CREATE_UPDATE = "group-create-update",
    GROUP_DELETE = "group-delete",
    SET_PLAYER_DETAILS = "set-player-details"
}

export class IoSocketController {
    Io: socketIO.Server;
    Worlds: Map<string, World> = new Map<string, World>();
    sockets: Map<string, ExSocketInterface> = new Map<string, ExSocketInterface>();

    constructor(server: http.Server) {
        this.Io = socketIO(server);

        // Authentication with token. it will be decoded and stored in the socket.
        // Completely commented for now, as we do not use the "/login" route at all.
        /*this.Io.use((socket: Socket, next) => {
            if (!socket.handshake.query || !socket.handshake.query.token) {
                return next(new Error('Authentication error'));
            }
            if(this.searchClientByToken(socket.handshake.query.token)){
                return next(new Error('Authentication error'));
            }
            Jwt.verify(socket.handshake.query.token, SECRET_KEY, (err: JsonWebTokenError, tokenDecoded: object) => {
                if (err) {
                    return next(new Error('Authentication error'));
                }
                (socket as ExSocketInterface).token = tokenDecoded;
                next();
            });
        });*/

        this.ioConnection();
        this.shareUsersPosition();
    }

    private sendUpdateGroupEvent(group: Group): void {
        // Let's get the room of the group. To do this, let's get anyone in the group and find its room.
        // Note: this is suboptimal
        let userId = group.getUsers()[0].id;
        let client: ExSocketInterface = this.searchClientByIdOrFail(userId);
        let roomId = client.roomId;
        this.Io.in(roomId).emit(SockerIoEvent.GROUP_CREATE_UPDATE, {
            position: group.getPosition(),
            groupId: group.getId()
        });
    }

    private sendDeleteGroupEvent(uuid: string, lastUser: UserInterface): void {
        // Let's get the room of the group. To do this, let's get anyone in the group and find its room.
        let userId = lastUser.id;
        let client: ExSocketInterface = this.searchClientByIdOrFail(userId);
        let roomId = client.roomId;
        this.Io.in(roomId).emit(SockerIoEvent.GROUP_DELETE, uuid);
    }

    ioConnection() {
        this.Io.on(SockerIoEvent.CONNECTION, (socket: Socket) => {
            this.sockets.set(socket.id, socket as ExSocketInterface);
            /*join-rom event permit to join one room.
                message :
                    userId : user identification
                    roomId: room identification
                    position: position of user in map
                        x: user x position on map
                        y: user y position on map
            */
            socket.on(SockerIoEvent.JOIN_ROOM, (roomId: any): void => {
                try {
                    if (typeof(roomId) !== 'string') {
                        socket.emit(SockerIoEvent.MESSAGE_ERROR, {message: 'Expected roomId as a string.'});
                        return;
                    }

                    let Client = (socket as ExSocketInterface);

                    if (Client.roomId === roomId) {
                        return;
                    }

                    //leave previous room
                    this.leaveRoom(Client);

                    //join new previous room
                    this.joinRoom(Client, roomId);

                    //add function to refresh position user in real time.
                    this.refreshUserPosition(Client);

                    let messageUserPosition = new MessageUserPosition(Client.id, Client.name, Client.character,new Point(0, 0, 'none'));

                    socket.to(roomId).emit(SockerIoEvent.JOIN_ROOM, messageUserPosition);
                } catch (e) {
                    console.error('An error occurred on "join_room" event');
                    console.error(e);
                }
            });

            socket.on(SockerIoEvent.USER_POSITION, (message: any): void => {
                try {
                    let position = this.hydratePositionReceive(message);
                    if (position instanceof Error) {
                        socket.emit(SockerIoEvent.MESSAGE_ERROR, {message: position.message});
                        return;
                    }

                    let Client = (socket as ExSocketInterface);

                    // sending to all clients in room except sender
                    Client.position = position;

                    //refresh position of all user in all rooms in real time
                    this.refreshUserPosition(Client);
                } catch (e) {
                    console.error('An error occurred on "user_position" event');
                    console.error(e);
                }
            });

            socket.on(SockerIoEvent.WEBRTC_SIGNAL, (data: any) => {
                //send only at user
                let client = this.sockets.get(data.receiverId);
                if (client === undefined) {
                    console.warn("While exchanging a WebRTC signal: client with id ", data.receiverId, " does not exist. This might be a race condition.");
                    return;
                }
                return client.emit(SockerIoEvent.WEBRTC_SIGNAL, data);
            });

            socket.on(SockerIoEvent.WEBRTC_OFFER, (data: any) => {
                //send only at user
                let client = this.sockets.get(data.receiverId);
                if (client === undefined) {
                    console.warn("While exchanging a WebRTC offer: client with id ", data.receiverId, " does not exist. This might be a race condition.");
                    return;
                }
                client.emit(SockerIoEvent.WEBRTC_OFFER, data);
            });

            socket.on(SockerIoEvent.DISCONNECT, () => {
                try {
                    let Client = (socket as ExSocketInterface);
                    //this.sendDisconnectedEvent(Client);

                    //refresh position of all user in all rooms in real time (to remove the disconnected user)
                    this.refreshUserPosition(Client);

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
                this.sockets.delete(socket.id);
            });

            // Let's send the user id to the user
            socket.on(SockerIoEvent.SET_PLAYER_DETAILS, (playerDetails: SetPlayerDetailsMessage, answerFn) => {
                let Client = (socket as ExSocketInterface);
                Client.name = playerDetails.name;
                Client.character = playerDetails.character;
                answerFn(socket.id);
            });
        });
    }

    searchClientByIdOrFail(userId: string): ExSocketInterface {
        let client: ExSocketInterface|undefined = this.sockets.get(userId);
        if (client === undefined) {
            throw new Error("Could not find user with id " + userId);
        }
        return client;
    }

    leaveRoom(Client : ExSocketInterface){
        //lease previous room and world
        if(Client.roomId){
            //user leave previous world
            let world : World|undefined = this.Worlds.get(Client.roomId);
            if(world){
                world.leave(Client);
                //this.Worlds.set(Client.roomId, world);
            }
            //user leave previous room
            Client.leave(Client.roomId);
            delete Client.roomId;
        }
    }

    joinRoom(Client : ExSocketInterface, roomId: string){
        //join user in room
        Client.join(roomId);
        Client.roomId = roomId;
        Client.position = new Point(-1000, -1000);

        //check and create new world for a room
        if(!this.Worlds.get(roomId)){
            let world = new World((user1: string, group: Group) => {
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

        let world : World|undefined = this.Worlds.get(roomId);

        if(world) {
            // Dispatch groups position to newly connected user
            world.getGroups().forEach((group: Group) => {
                Client.emit(SockerIoEvent.GROUP_CREATE_UPDATE, {
                    position: group.getPosition(),
                    groupId: group.getId()
                });
            });
            //join world
            world.join(Client, Client.position);
            this.Worlds.set(roomId, world);
        }
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
        let clients: Array<ExSocketInterface> = (Object.values(this.Io.sockets.sockets) as Array<ExSocketInterface>)
            .filter((client: ExSocketInterface) => client.webRtcRoomId && client.webRtcRoomId === roomId);
        //send start at one client to initialise offer webrtc
        //send all users in room to create PeerConnection in front
        clients.forEach((client: ExSocketInterface, index: number) => {

            let clientsId = clients.reduce((tabs: Array<any>, clientId: ExSocketInterface, indexClientId: number) => {
                if (!clientId.id || clientId.id === client.id) {
                    return tabs;
                }
                tabs.push({
                    userId: clientId.id,
                    name: clientId.name,
                    initiator: index <= indexClientId
                });
                return tabs;
            }, []);

            client.emit(SockerIoEvent.WEBRTC_START, {clients: clientsId, roomId: roomId});
        });
    }

    refreshUserPosition(Client : ExSocketInterface) {
        //refresh position of all user in all rooms in real time
        let rooms = (this.Io.sockets.adapter.rooms as ExtRoomsInterface);
        if (!rooms.refreshUserPosition) {
            rooms.refreshUserPosition = RefreshUserPositionFunction;
        }
        rooms.refreshUserPosition(rooms, this.Io);

        // update position in the world
        let world = this.Worlds.get(Client.roomId);
        if (!world) {
            return;
        }
        world.updatePosition(Client, Client.position);
        this.Worlds.set(Client.roomId, world);
    }

    //Hydrate and manage error
    hydratePositionReceive(message: any): Point | Error {
        try {
            if (!message.x || !message.y || !message.direction) {
                return new Error("invalid point message sent");
            }
            return new Point(message.x, message.y, message.direction);
        } catch (err) {
            //TODO log error
            return new Error(err);
        }
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
    seTimeOutInProgress: any = null;

    shareUsersPosition() {
        if (this.seTimeOutInProgress) {
            clearTimeout(this.seTimeOutInProgress);
        }
        //send for each room, all data of position user
        let arrayMap = (this.Io.sockets.adapter.rooms as ExtRooms).userPositionMapByRoom;
        if (!arrayMap) {
            this.seTimeOutInProgress = setTimeout(() => {
                this.shareUsersPosition();
            }, 10);
            return;
        }
        arrayMap.forEach((value: any) => {
            let roomId = value[0];
            this.Io.in(roomId).emit(SockerIoEvent.USER_POSITION, value);
        });
        this.seTimeOutInProgress = setTimeout(() => {
            this.shareUsersPosition();
        }, 10);
    }

    //connected user
    connectedUser(userId: string, group: Group) {
        /*let Client = this.sockets.get(userId);
        if (Client === undefined) {
            return;
        }*/
        let Client = this.searchClientByIdOrFail(userId);
        this.joinWebRtcRoom(Client, group.getId());
    }

    //disconnect user
    disConnectedUser(userId: string, group: Group) {
        let Client = this.searchClientByIdOrFail(userId);
        Client.to(group.getId()).emit(SockerIoEvent.WEBRTC_DISCONNECT, {
            userId: userId
        });

        //disconnect webrtc room
        if(!Client.webRtcRoomId){
            return;
        }
        Client.leave(Client.webRtcRoomId);
        delete Client.webRtcRoomId;
    }
}
