import {PositionMessage} from "../../../messages/generated/messages_pb";
import {PointInterface} from "../Connection";
import Direction = PositionMessage.Direction;

export class ProtobufClientUtils {

    public static toPointInterface(position: PositionMessage): PointInterface {
        let direction: string;
        switch (position.getDirection()) {
            case Direction.UP:
                direction = 'up';
                break;
            case Direction.DOWN:
                direction = 'down';
                break;
            case Direction.LEFT:
                direction = 'left';
                break;
            case Direction.RIGHT:
                direction = 'right';
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
}
