import { PositionMessage } from "../../Messages/ts-proto-generated/protos/messages";

export interface HasPlayerMovedInterface extends PositionMessage {
    oldX?: number;
    oldY?: number;
}
