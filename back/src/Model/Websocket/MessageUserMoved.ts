import {PointInterface} from "./PointInterface";

export class MessageUserMoved {
    constructor(public userId: string, public position: PointInterface) {
    }
}
