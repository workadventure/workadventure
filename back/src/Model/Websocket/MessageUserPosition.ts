import {PointInterface} from "./PointInterface";

export class Point implements PointInterface{
    constructor(public x : number, public y : number, public direction : string = "none", public moving : boolean = false) {
    }
}

export class MessageUserPosition {
    constructor(public userId: string, public name: string, public characterLayers: string[], public position: PointInterface) {
    }
}
