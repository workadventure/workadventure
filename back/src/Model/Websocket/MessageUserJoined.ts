import {PointInterface} from "_Model/Websocket/PointInterface";

export class MessageUserJoined {
    constructor(public userId: string, public name: string, public character: string, public position: PointInterface) {
    }
}
