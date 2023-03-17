import type { PositionMessage } from "@workadventure/messages";
import { PositionMessage_Direction } from "@workadventure/messages";
import type { PointInterface } from "./PointInterface";

export class ProtobufUtils {
    public static toPositionMessage(point: PointInterface): PositionMessage {
        let direction: PositionMessage_Direction;
        switch (point.direction) {
            case "up":
                direction = PositionMessage_Direction.UP;
                break;
            case "down":
                direction = PositionMessage_Direction.DOWN;
                break;
            case "left":
                direction = PositionMessage_Direction.LEFT;
                break;
            case "right":
                direction = PositionMessage_Direction.RIGHT;
                break;
            default:
                throw new Error("unexpected direction");
        }

        return {
            ...point,
            direction,
        };
    }
}
