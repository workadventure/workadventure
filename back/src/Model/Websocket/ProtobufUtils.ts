import { ItemEventMessage, PointMessage, PositionMessage, PositionMessage_Direction } from "@workadventure/messages";
import { ItemEventMessageInterface } from "../../Model/Websocket/ItemEventMessage";
import { PositionInterface } from "../../Model/PositionInterface";
import { PointInterface } from "./PointInterface";

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
            ...position,
            direction,
        };
    }

    public static toPointMessage(point: PositionInterface): PointMessage {
        return {
            x: Math.floor(point.x),
            y: Math.floor(point.y),
        };
    }

    public static toItemEvent(itemEventMessage: ItemEventMessage): ItemEventMessageInterface {
        return {
            itemId: itemEventMessage.itemId,
            event: itemEventMessage.event,
            parameters: JSON.parse(itemEventMessage.parametersJson),
            state: JSON.parse(itemEventMessage.stateJson),
        };
    }

    public static toItemEventProtobuf(itemEvent: ItemEventMessageInterface): ItemEventMessage {
        return {
            itemId: itemEvent.itemId,
            event: itemEvent.event,
            parametersJson: JSON.stringify(itemEvent.parameters),
            stateJson: JSON.stringify(itemEvent.state),
        };
    }
}
