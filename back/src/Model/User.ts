import { Group } from "./Group";
import { PointInterface } from "./Websocket/PointInterface";
import {Zone} from "_Model/Zone";
import {Movable} from "_Model/Movable";
import {PositionInterface} from "_Model/PositionInterface";

export class User implements Movable {
    public listenedZones: Set<Zone>;
    public group?: Group;

    public constructor(
        public id: string,
        public position: PointInterface,
        public silent: boolean,

    ) {
        this.listenedZones = new Set<Zone>();
    }

    public getPosition(): PositionInterface {
        return this.position;
    }
}
