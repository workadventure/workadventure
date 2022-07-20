import { PositionMessage, PositionMessage_Direction } from "../Messages/ts-proto-generated/protos/messages";

import type { PointInterface } from "../Connexion/ConnexionModels";

export interface MucRoomDefinitionInterface {
    name: string;
    url: string;
    type: string;
}

export class ProtobufClientUtils {
    public static toPointInterface(position: PositionMessage): PointInterface {
        let direction: "up" | "down" | "left" | "right";
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
