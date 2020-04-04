import socketIO = require('socket.io');
import {Socket} from "socket.io";
import * as http from "http";
import {JoinRoomMessage} from "@Model/Websocket/JoinRoomMessage";

export class IoSocketController{
    Io: socketIO.Server;
    constructor(server : http.Server) {
        this.Io = socketIO(server);
        this.ioConnection();
    }

    ioConnection() {
        this.Io.on('connection',  (socket: Socket) => {
            //TODO check token access

            /*join-rom event permit to join one room.
                message :
                    userId : user identification
                    roomId: room identification
                    positionXUser: user x position map
                    positionYUser: user y position on map
            */
            socket.on('join-room', (message : JoinRoomMessage) => {
                socket.join(message.roomId);
                socket.to(message.roomId).emit('join-room', message.toString());
            });
        });
    }
}