import {PointInterface} from "_Model/Websocket/PointInterface";

export class MessageUserJoined {
    constructor(public userId: string, public name: string, public characterLayers: string[], public position: PointInterface) {
    }
}
