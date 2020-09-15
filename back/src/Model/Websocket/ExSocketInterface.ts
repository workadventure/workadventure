import {Socket} from "socket.io";
import {PointInterface} from "./PointInterface";
import {Identificable} from "./Identificable";
import {TokenInterface} from "../../Controller/AuthenticateController";
import {ViewportInterface} from "_Model/Websocket/ViewportMessage";

export interface ExSocketInterface extends Socket, Identificable {
    token: string;
    roomId: string;
    webRtcRoomId: string;
    userId: string;
    name: string;
    characterLayers: string[];
    position: PointInterface;
    viewport: ViewportInterface;
    isArtillery: boolean; // Whether this socket is opened by Artillery for load testing (hack)
    /**
     * Pushes an event that will be sent in the next batch of events
     */
    emitInBatch: (event: string | symbol, payload: any) => void;
    batchedMessages: Array<{ event: string | symbol, payload: any }>;
    batchTimeout: NodeJS.Timeout|null;
}
