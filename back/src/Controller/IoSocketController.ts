import socketIO = require('socket.io');
import {Socket} from "socket.io";
import * as http from "http";
import {MessageUserPosition} from "@Model/Websocket/MessageUserPosition";
import {ExSocketInterface} from "@Model/Websocket/ExSocketInterface";
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