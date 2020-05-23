import {Socket} from "socket.io";
import {PointInterface} from "./PointInterface";
import {Identificable} from "./Identificable";

export interface ExSocketInterface extends Socket, Identificable {
    token: any;
    roomId: string;
    webRtcRoomId: string;
    userId: string;
    name: string;
    character: string;
    position: PointInterface;
}
