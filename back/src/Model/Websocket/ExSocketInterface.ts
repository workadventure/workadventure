import {PointInterface} from "./PointInterface";
import {Identificable} from "./Identificable";
import {TokenInterface} from "../../Controller/AuthenticateController";
import {ViewportInterface} from "_Model/Websocket/ViewportMessage";
import {BatchMessage, SubMessage} from "../../Messages/generated/messages_pb";
import {WebSocket} from "uWebSockets.js"

export interface ExSocketInterface extends WebSocket, Identificable {
    token: string;
    roomId: string;
    webRtcRoomId: string|undefined;
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
    emitInBatch: (payload: SubMessage) => void;
    batchedMessages: BatchMessage;
    batchTimeout: NodeJS.Timeout|null;
    disconnecting: boolean
}
