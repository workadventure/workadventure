import {PointInterface} from "./PointInterface";

export class MessageUserMoved {
    constructor(public userId: number, public position: PointInterface) {
    }
}
