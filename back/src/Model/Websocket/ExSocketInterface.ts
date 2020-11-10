import {PointInterface} from "./PointInterface";
import {Identificable} from "./Identificable";
import {ViewportInterface} from "_Model/Websocket/ViewportMessage";
import {BatchMessage, SubMessage} from "../../Messages/generated/messages_pb";
import {WebSocket} from "uWebSockets.js"
import {CharacterTexture} from "../../Services/AdminApi";

export interface CharacterLayer {
    name: string,
    url: string|undefined
}

export interface ExSocketInterface extends WebSocket, Identificable {
    token: string;
    roomId: string;
    //userId: number;   // A temporary (autoincremented) identifier for this user
    userUuid: string; // A unique identifier for this user
    name: string;
    characterLayers: CharacterLayer[];
    position: PointInterface;
    viewport: ViewportInterface;
    /**
     * Pushes an event that will be sent in the next batch of events
     */
    emitInBatch: (payload: SubMessage) => void;
    batchedMessages: BatchMessage;
    batchTimeout: NodeJS.Timeout|null;
    pingTimeout: NodeJS.Timeout|null;
    pongTimeout: NodeJS.Timeout|null;
    disconnecting: boolean,
    tags: string[],
    textures: CharacterTexture[],
}
