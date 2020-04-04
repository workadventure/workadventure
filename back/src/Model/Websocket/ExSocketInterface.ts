import {Socket} from "socket.io";

export interface ExSocketInterface extends Socket {
    token: object;
}