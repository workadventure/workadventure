import { MAX_EXTRAPOLATION_TIME } from "../../Enum/EnvironmentVariable";
import type { PositionInterface } from "../../Connection/ConnexionModels";
import type { HasPlayerMovedInterface } from "../../Api/Events/HasPlayerMovedInterface";

export class PlayerMovement {
    public constructor(
        private startPosition: PositionInterface,
        private startTick: number,
        private endPosition: HasPlayerMovedInterface,
        private endTick: number
    ) {}

    public isOutdated(tick: number): boolean {
        // If the endPosition is NOT moving, no extrapolation needed.
        if (this.endPosition.moving === false && tick > this.endTick) {
            return true;
        }

        return tick > this.endTick + MAX_EXTRAPOLATION_TIME;
    }

    public getPosition(tick: number): HasPlayerMovedInterface {
        // Special case: end position reached and end position is not moving
        if (tick >= this.endTick && this.endPosition.moving === false) {
            return this.endPosition;
        }

        const x =
            (this.endPosition.x - this.startPosition.x) * ((tick - this.startTick) / (this.endTick - this.startTick)) +
            this.startPosition.x;
        const y =
            (this.endPosition.y - this.startPosition.y) * ((tick - this.startTick) / (this.endTick - this.startTick)) +
            this.startPosition.y;
        return {
            x,
            y,
            oldX: this.startPosition.x,
            oldY: this.startPosition.y,
            direction: this.endPosition.direction,
            moving: this.isOutdated(tick) ? false : this.endPosition.moving,
        };
    }
}
