import {Socket} from "socket.io";
import {PointInterface} from "./PointInterface";
import {Identificable} from "./Identificable";
import {TokenInterface} from "../../Controller/AuthenticateController";

export interface ExSocketInterface extends Socket, Identificable {
    token: string;
    roomId: string;
    webRtcRoomId: string;
    userId: string;
    name: string;
    character: string;
    position: PointInterface;
}
