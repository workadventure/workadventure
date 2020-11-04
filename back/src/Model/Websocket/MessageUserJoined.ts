import {PointInterface} from "_Model/Websocket/PointInterface";

export class MessageUserJoined {
    constructor(public userId: number, public name: string, public characterLayers: string[], public position: PointInterface) {
    }
}
