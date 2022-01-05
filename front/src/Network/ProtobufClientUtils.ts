import { PositionMessage, PositionMessage_Direction } from "../Messages/ts-proto-generated/messages";

import type { PointInterface } from "../Connexion/ConnexionModels";

export class ProtobufClientUtils {
    public static toPointInterface(position: PositionMessage): PointInterface {
        let direction: string;
        switch (position.direction) {
            case PositionMessage_Direction.UP:
                direction = "up";
                break;
            case PositionMessage_Direction.DOWN:
                direction = "down";
                break;
            case PositionMessage_Direction.LEFT:
                direction = "left";
                break;
            case PositionMessage_Direction.RIGHT:
                direction = "right";
                break;
            default:
                throw new Error("Unexpected direction");
        }

        // sending to all clients in room except sender
        return {
            x: position.x,
            y: position.y,
            direction,
            moving: position.moving,
        };
    }
}
