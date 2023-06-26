import { PositionMessage_Direction } from "@workadventure/messages";

export interface MucRoomDefinition {
    name: string;
    url: string;
    type: string;
}

export class ProtobufClientUtils {
    public static toDirectionString(direction: PositionMessage_Direction): "up" | "down" | "left" | "right" {
        switch (direction) {
            case PositionMessage_Direction.UP:
                return "up";
            case PositionMessage_Direction.DOWN:
                return "down";
            case PositionMessage_Direction.LEFT:
                return "left";
            case PositionMessage_Direction.RIGHT:
                return "right";
            default:
                throw new Error("Unexpected direction");
        }
    }
}
