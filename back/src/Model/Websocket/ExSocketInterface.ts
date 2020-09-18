import {Socket} from "socket.io";
import {PointInterface} from "./PointInterface";
import {Identificable} from "./Identificable";
import {TokenInterface} from "../../Controller/AuthenticateController";
import {ViewportInterface} from "_Model/Websocket/ViewportMessage";

export interface ExSocketInterface extends Socket, Identificable {
    token: string;
    roomId: string;
    webRtcRoomId: string;
    userId: number;   // A temporary (autoincremented) identifier for this user
    userUuid: string; // A unique identifier for this user
    name: string;
    characterLayers: string[];
    position: PointInterface;
    viewport: ViewportInterface;
    isArtillery: boolean; // Whether this socket is opened by Artillery for load testing (hack)
    /**
     * Pushes an event that will be sent in the next batch of events
     */
    emitInBatch: (event: string | symbol, payload: unknown) => void;
    batchedMessages: Array<{ event: string | symbol, payload: unknown }>;
    batchTimeout: NodeJS.Timeout|null;
}
