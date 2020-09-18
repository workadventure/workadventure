import {PointInterface} from "./PointInterface";
import {PositionMessage} from "../../../../messages/generated/messages_pb";
import {ExSocketInterface} from "_Model/Websocket/ExSocketInterface";
import Direction = PositionMessage.Direction;

export class ProtobufUtils {

    public static toPositionMessage(point: PointInterface): PositionMessage {
        let direction: PositionMessage.DirectionMap[keyof PositionMessage.DirectionMap];
        switch (point.direction) {
            case 'up':
                direction = Direction.UP;
                break;
            case 'down':
                direction = Direction.DOWN;
                break;
            case 'left':
                direction = Direction.LEFT;
                break;
            case 'right':
                direction = Direction.RIGHT;
                break;
            default:
                throw new Error('unexpected direction');
        }

        const position = new PositionMessage();
        position.setX(point.x);
        position.setY(point.y);
        position.setMoving(point.moving);
        position.setDirection(direction);

        return position;
    }
}
