import type {HasMovedEvent} from "./GameManager";
import {MAX_EXTRAPOLATION_TIME} from "../../Enum/EnvironmentVariable";
import type {PositionInterface} from "../../Connexion/ConnexionModels";

export class PlayerMovement {
    public constructor(private startPosition: PositionInterface, private startTick: number, private endPosition: HasMovedEvent, private endTick: number) {
    }

    public isOutdated(tick: number): boolean {
        //console.log(tick, this.endTick, MAX_EXTRAPOLATION_TIME)

        // If the endPosition is NOT moving, no extrapolation needed.
        if (this.endPosition.moving === false && tick > this.endTick) {
            return true;
        }

        return tick > this.endTick + MAX_EXTRAPOLATION_TIME;
    }

    public getPosition(tick: number): HasMovedEvent {
        // Special case: end position reached and end position is not moving
        if (tick >= this.endTick && this.endPosition.moving === false) {
            //console.log('Movement finished ', this.endPosition)
            return this.endPosition;
        }

        const x = (this.endPosition.x - this.startPosition.x) * ((tick - this.startTick) / (this.endTick - this.startTick)) + this.startPosition.x;
        const y = (this.endPosition.y - this.startPosition.y) * ((tick - this.startTick) / (this.endTick - this.startTick)) + this.startPosition.y;
        //console.log('Computed position ', x, y)
        return {
            x,
            y,
            direction: this.endPosition.direction,
            moving: true
        }
    }
}
