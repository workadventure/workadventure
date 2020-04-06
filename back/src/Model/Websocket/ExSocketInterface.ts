import {Socket} from "socket.io";
import {PointInterface} from "./PointInterface";

export interface ExSocketInterface extends Socket {
    token: any;
    roomId: string;
    userId: string;
    position: PointInterface;
}