import { Group } from "./Group";
import { PointInterface } from "./Websocket/PointInterface";
import {Zone} from "_Model/Zone";
import {Movable} from "_Model/Movable";
import {PositionInterface} from "_Model/PositionInterface";
import {PositionDispatcher} from "_Model/PositionDispatcher";
import {ExSocketInterface} from "_Model/Websocket/ExSocketInterface";

export class User implements Movable {
    public listenedZones: Set<Zone>;
    public group?: Group;

    public constructor(
        public id: number,
        public uuid: string,
        private position: PointInterface,
        public silent: boolean,
        private positionNotifier: PositionDispatcher,
        public readonly socket: ExSocketInterface
    ) {
        this.listenedZones = new Set<Zone>();

        this.positionNotifier.enter(this);
    }

    public getPosition(): PointInterface {
        return this.position;
    }

    public setPosition(position: PointInterface): void {
        const oldPosition = this.position;
        this.position = position;
        this.positionNotifier.updatePosition(this, position, oldPosition);
    }
}
