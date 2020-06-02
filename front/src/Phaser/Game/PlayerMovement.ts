import {HasMovedEvent} from "./GameManager";
import {MAX_EXTRAPOLATION_TIME} from "../../Enum/EnvironmentVariable";

export class PlayerMovement {
    public constructor(private startPosition: HasMovedEvent, private startTick: number, private endPosition: HasMovedEvent, private endTick: number) {
    }

    public isOutdated(tick: number): boolean {
        return tick > this.endTick + MAX_EXTRAPOLATION_TIME;
    }

    public getPosition(tick: number): HasMovedEvent {
        let x = (this.endPosition.x - this.startPosition.x) * ((tick - this.startTick) / (this.endTick - this.startTick)) + this.startPosition.x;
        let y = (this.endPosition.y - this.startPosition.y) * ((tick - this.startTick) / (this.endTick - this.startTick)) + this.startPosition.y;

        return {
            x,
            y,
            direction: this.endPosition.direction,
            moving: this.endPosition.moving
        }
    }
}
