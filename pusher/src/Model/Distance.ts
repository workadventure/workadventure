import {MessageUserPosition} from "../Model/Websocket/MessageUserPosition";

export interface Distance {
    distance: number,
    first: MessageUserPosition,
    second: MessageUserPosition,
}