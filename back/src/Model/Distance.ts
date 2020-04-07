import {MessageUserPosition} from "../Model/Websocket/MessageUserPosition";

export interface Distance {
    distance: number,
    user1: MessageUserPosition,
    user2: MessageUserPosition,
}