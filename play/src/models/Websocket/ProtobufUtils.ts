import type { PointInterface } from "./PointInterface";
import {
    CharacterLayerMessage,
    ItemEventMessage,
    PointMessage,
    PositionMessage,
} from "../../messages/generated/messages_pb";
import Direction = PositionMessage.Direction;
import type { ItemEventMessageInterface } from "../../models/Websocket/ItemEventMessage";
import type { PositionInterface } from "../../models/PositionInterface";
import type { WokaDetail } from "../../messages/JsonMessages/PlayerTextures";

export class ProtobufUtils {
    public static toPositionMessage(point: PointInterface): PositionMessage {
        let direction: Direction;
        switch (point.direction) {
            case "up":
                direction = Direction.UP;
                break;
            case "down":
                direction = Direction.DOWN;
                break;
            case "left":
                direction = Direction.LEFT;
                break;
            case "right":
                direction = Direction.RIGHT;
                break;
            default:
                throw new Error("unexpected direction");
        }

        const position = new PositionMessage();
        position.setX(point.x);
        position.setY(point.y);
        position.setMoving(point.moving);
        position.setDirection(direction);

        return position;
    }

    public static toPointInterface(position: PositionMessage): PointInterface {
        let direction: string;
        switch (position.getDirection()) {
            case Direction.UP:
                direction = "up";
                break;
            case Direction.DOWN:
                direction = "down";
                break;
            case Direction.LEFT:
                direction = "left";
                break;
            case Direction.RIGHT:
                direction = "right";
                break;
            default:
                throw new Error("Unexpected direction");
        }

        // sending to all clients in room except sender
        return {
            x: position.getX(),
            y: position.getY(),
            direction,
            moving: position.getMoving(),
        };
    }

    public static toPointMessage(point: PositionInterface): PointMessage {
        const position = new PointMessage();
        position.setX(Math.floor(point.x));
        position.setY(Math.floor(point.y));

        return position;
    }

    public static toItemEvent(itemEventMessage: ItemEventMessage): ItemEventMessageInterface {
        return {
            itemId: itemEventMessage.getItemid(),
            event: itemEventMessage.getEvent(),
            parameters: JSON.parse(itemEventMessage.getParametersjson()),
            state: JSON.parse(itemEventMessage.getStatejson()),
        };
    }

    public static toItemEventProtobuf(itemEvent: ItemEventMessageInterface): ItemEventMessage {
        const itemEventMessage = new ItemEventMessage();
        itemEventMessage.setItemid(itemEvent.itemId);
        itemEventMessage.setEvent(itemEvent.event);
        itemEventMessage.setParametersjson(JSON.stringify(itemEvent.parameters));
        itemEventMessage.setStatejson(JSON.stringify(itemEvent.state));

        return itemEventMessage;
    }

    public static toCharacterLayerMessages(characterLayers: WokaDetail[]): CharacterLayerMessage[] {
        return characterLayers.map(function (characterLayer): CharacterLayerMessage {
            const message = new CharacterLayerMessage();
            message.setName(characterLayer.id);
            if (characterLayer.url) {
                message.setUrl(characterLayer.url);
            }
            if (characterLayer.layer) {
                message.setLayer(characterLayer.layer);
            }
            return message;
        });
    }
}
