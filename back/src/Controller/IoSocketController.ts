import socketIO = require('socket.io');
import {Socket} from "socket.io";
import * as http from "http";
import {MessageUserPosition} from "../Model/Websocket/MessageUserPosition"; //TODO fix import by "_Model/.."
import {ExSocketInterface} from "../Model/Websocket/ExSocketInterface"; //TODO fix import by "_Model/.."
import Jwt, {JsonWebTokenError} from "jsonwebtoken";
import {SECRET_KEY} from "../Enum/EnvironmentVariable"; //TODO fix import by "_Enum/..."
import {ExtRooms, RefreshUserPositionFunction} from "../Model/Websocket/ExtRoom";
import {ExtRoomsInterface} from "../Model/Websocket/ExtRoomsInterface";
import {World} from "../Model/World";
import {Group} from "_Model/Group";

enum SockerIoEvent {
    CONNECTION = "connection",
    DISCONNECTION = "disconnect",
    JOIN_ROOM = "join-room",
    USER_POSITION = "user-position",
    WEBRTC_SIGNAL = "webrtc-signal",
    WEBRTC_START = "webrtc-start",
    MESSAGE_ERROR = "message-error",
}

export class IoSocketController{
    Io: socketIO.Server;
    World: World;
    constructor(server : http.Server) {
        this.Io = socketIO(server);

        // Authentication with token. it will be decoded and stored in the socket.
        this.Io.use( (socket: Socket, next) => {
            if (!socket.handshake.query || !socket.handshake.query.token) {
                return next(new Error('Authentication error'));
            }
            Jwt.verify(socket.handshake.query.token, SECRET_KEY, (err: JsonWebTokenError, tokenDecoded: object) => {
                if (err) {
                    return next(new Error('Authentication error'));
                }
                (socket as ExSocketInterface).token = tokenDecoded;
                next();
            });
        });

        this.ioConnection();
        this.shareUsersPosition();

        //don't send only function because the context will be not this
        this.World = new World((user1 : string, user2 : string, group: Group) => {
            this.connectedUser(user1, user2, group);
        }, (user1 : string, user2 : string, group: Group) => {
            this.disConnectedUser(user1, user2, group);
        });
    }

    ioConnection() {
        this.Io.on(SockerIoEvent.CONNECTION,  (socket: Socket) => {
            /*join-rom event permit to join one room.
                message :
                    userId : user identification
                    roomId: room identification
                    position: position of user in map
                        x: user x position on map
                        y: user y position on map
            */
            socket.on(SockerIoEvent.JOIN_ROOM, (message : string) => {
                let messageUserPosition = this.hydrateMessageReceive(message);
                if(messageUserPosition instanceof Error){
                    return socket.emit(SockerIoEvent.MESSAGE_ERROR, JSON.stringify({message: messageUserPosition.message}))
                }

                //join user in room
                socket.join(messageUserPosition.roomId);

                //join user in world
                this.World.join(messageUserPosition);

                // sending to all clients in room except sender
                this.saveUserInformation((socket as ExSocketInterface), messageUserPosition);

                //add function to refresh position user in real time.
                let rooms = (this.Io.sockets.adapter.rooms as ExtRoomsInterface);
                rooms.refreshUserPosition = RefreshUserPositionFunction;
                rooms.refreshUserPosition(rooms, this.Io);

                socket.to(messageUserPosition.roomId).emit(SockerIoEvent.JOIN_ROOM, messageUserPosition.toString());
            });

            socket.on(SockerIoEvent.USER_POSITION, (message : string) => {
                let messageUserPosition = this.hydrateMessageReceive(message);
                if (messageUserPosition instanceof Error) {
                    return socket.emit(SockerIoEvent.MESSAGE_ERROR, JSON.stringify({message: messageUserPosition.message}));
                }

                // update position in the worl
                this.World.updatePosition(messageUserPosition);

                // sending to all clients in room except sender
                this.saveUserInformation((socket as ExSocketInterface), messageUserPosition);

                //refresh position of all user in all rooms in real time
                let rooms = (this.Io.sockets.adapter.rooms as ExtRoomsInterface);
                if(!rooms.refreshUserPosition){
                    rooms.refreshUserPosition = RefreshUserPositionFunction;
                }
                rooms.refreshUserPosition(rooms, this.Io);
            });

            socket.on(SockerIoEvent.WEBRTC_SIGNAL, (message : string) => {
                let data : any = JSON.parse(message);

                //send only at user
                let clients: Array<any> = Object.values(this.Io.sockets.sockets);
                for(let i = 0; i < clients.length; i++){
                    let client : ExSocketInterface = clients[i];
                    if(client.userId !== data.receiverId){
                        continue
                    }
                    client.emit(SockerIoEvent.WEBRTC_SIGNAL,  message);
                    break;
                }
            });

            socket.on(SockerIoEvent.DISCONNECTION, (reason : string) => {
                let Client = (socket as ExSocketInterface);
                //leave group of user
                this.World.leave(Client);

                //leave room
                socket.leave(Client.roomId);
                socket.leave(Client.webRtcRoomId);

                //delete all socket information
                delete Client.userId;
                delete Client.webRtcRoomId;
                delete Client.roomId;
                delete Client.token;
                delete Client.position;
            });
        });
    }

    /**
     *
     * @param socket
     * @param roomId
     */
    joinWebRtcRoom(socket : ExSocketInterface, roomId : string) {
        if(socket.webRtcRoomId === roomId){
            return;
        }
        socket.join(roomId);
        socket.webRtcRoomId = roomId;
        //if two persone in room share
        if (this.Io.sockets.adapter.rooms[roomId].length < 2) {
            return;
        }
        let clients: Array<any> = Object.values(this.Io.sockets.sockets);

        //send start at one client to initialise offer webrtc
        //send all users in room to create PeerConnection in front
        clients.forEach((client: ExSocketInterface, index: number) => {

            let clientsId = clients.reduce((tabs: Array<any>, clientId: ExSocketInterface, indexClientId: number) => {
                if (!clientId.userId || clientId.userId === client.userId) {
                    return tabs;
                }
                tabs.push({
                    userId: clientId.userId,
                    initiator: index <= indexClientId
                });
                return tabs;
            }, []);

            client.emit(SockerIoEvent.WEBRTC_START, JSON.stringify({clients: clientsId, roomId: roomId}));
        });
    }

    //permit to save user position in socket
    saveUserInformation(socket : ExSocketInterface, message : MessageUserPosition){
        socket.position = message.position;
        socket.roomId = message.roomId;
        socket.userId = message.userId;
    }

    //Hydrate and manage error
    hydrateMessageReceive(message : string) : MessageUserPosition | Error{
        try {
            return new MessageUserPosition(JSON.parse(message));
        }catch (err) {
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
    seTimeOutInProgress : any = null;
    shareUsersPosition(){
        if(this.seTimeOutInProgress){
            clearTimeout(this.seTimeOutInProgress);
        }
        //send for each room, all data of position user
        let arrayMap = (this.Io.sockets.adapter.rooms as ExtRooms).userPositionMapByRoom;
        if(!arrayMap){
            this.seTimeOutInProgress = setTimeout(() => {
                this.shareUsersPosition();
            }, 10);
            return;
        }
        arrayMap.forEach((value : any) => {
            let roomId = value[0];
            this.Io.in(roomId).emit('user-position', JSON.stringify(arrayMap));
        });
        this.seTimeOutInProgress = setTimeout(() => {
            this.shareUsersPosition();
        }, 10);
    }

    //connected user
    connectedUser(user1 : string, user2 : string, group : Group) {
        if(!group){
            return;
        }
        /* TODO manager room and group user to enter and leave */
        let clients: Array<any> = Object.values(this.Io.sockets.sockets);
        let User1 = clients.find((user: ExSocketInterface) => user.userId === user1);
        let User2 = clients.find((user: ExSocketInterface) => user.userId === user2);

        if (User1) {
            this.joinWebRtcRoom(User1, group.getId());
        }
        if (User2) {
            this.joinWebRtcRoom(User2, group.getId());
        }
    }

    //connected user
    disConnectedUser(user1 : string, user2 : string, group : Group){
        console.log("disConnectedUser => user1", user1);
        console.log("disConnectedUser => user2", user2);
        console.log("group", group);
    }
}
