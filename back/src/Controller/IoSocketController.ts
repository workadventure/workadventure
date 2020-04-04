import socketIO = require('socket.io');
import {Socket} from "socket.io";
import * as http from "http";
import {MessageUserPosition} from "@Model/Websocket/MessageUserPosition";

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
            socket.on('join-room', (message : MessageUserPosition) => {
                socket.join(message.roomId);
                // sending to all clients in room except sender
                socket.to(message.roomId).emit('join-room', message.toString());
            });

            socket.on('user-position', (message : MessageUserPosition) => {
                // sending to all clients in room except sender
                socket.to(message.roomId).emit('join-room', message.toString());
            });
        });
    }
}