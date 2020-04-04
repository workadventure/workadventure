import socketIO = require('socket.io');
import {Socket} from "socket.io";
import * as http from "http";
import {MessageUserPosition} from "../Model/Websocket/MessageUserPosition"; //TODO fix to use "_Model/.."
import {ExSocketInterface} from "../Model/Websocket/ExSocketInterface"; //TODO fix to use "_Model/.."
import Jwt, {JsonWebTokenError} from "jsonwebtoken";

const SECRET_KEY = process.env.SECRET_KEY || "THECODINGMACHINE_SECRET_KEY";

export class IoSocketController{
    Io: socketIO.Server;
    constructor(server : http.Server) {
        this.Io = socketIO(server);

        //authentication with token. it will be decodes and stock in socket.
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
    }

    ioConnection() {
        this.Io.on('connection',  (socket: Socket) => {
            /*join-rom event permit to join one room.
                message :
                    userId : user identification
                    roomId: room identification
                    position: position of user in map
                        x: user x position on map
                        y: user y position on map
            */
            socket.on('join-room', (message : string) => {
                let messageUserPosition = new MessageUserPosition(message);
                socket.join(messageUserPosition.roomId);
                // sending to all clients in room except sender
                this.saveUserPosition((socket as ExSocketInterface), messageUserPosition);
                socket.to(messageUserPosition.roomId).emit('join-room', messageUserPosition.toString());
            });

            socket.on('user-position', (message : string) => {
                let messageUserPosition = new MessageUserPosition(message);
                // sending to all clients in room except sender
                this.saveUserPosition((socket as ExSocketInterface), messageUserPosition);
                socket.to(messageUserPosition.roomId).emit('join-room', messageUserPosition.toString());
            });
        });
    }

    //permit to save user position in socket
    saveUserPosition(socket : ExSocketInterface, message : MessageUserPosition){
        socket.position = message.position;
    }
}