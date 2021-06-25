import { PointInterface } from "./PointInterface";
import {
    CharacterLayerMessage,
    ItemEventMessage,
    PointMessage,
    PositionMessage,
} from "../../Messages/generated/messages_pb";
import { CharacterLayer } from "_Model/Websocket/CharacterLayer";
import Direction = PositionMessage.Direction;
import { ItemEventMessageInterface } from "_Model/Websocket/ItemEventMessage";
import { PositionInterface } from "_Model/PositionInterface";

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

    public static toCharacterLayerMessages(characterLayers: CharacterLayer[]): CharacterLayerMessage[] {
        return characterLayers.map(function (characterLayer): CharacterLayerMessage {
            const message = new CharacterLayerMessage();
            message.setName(characterLayer.name);
            if (characterLayer.url) {
                message.setUrl(characterLayer.url);
            }
            return message;
        });
    }

    public static toCharacterLayerObjects(characterLayers: CharacterLayerMessage[]): CharacterLayer[] {
        return characterLayers.map(function (characterLayer): CharacterLayer {
            const url = characterLayer.getUrl();
            return {
                name: characterLayer.getName(),
                url: url ? url : undefined,
            };
        });
    }
}
