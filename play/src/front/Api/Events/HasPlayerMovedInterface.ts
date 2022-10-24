import type { PositionMessage } from "../../../messages/ts-proto-generated/protos/messages";

export interface HasPlayerMovedInterface extends PositionMessage {
    oldX?: number;
    oldY?: number;
}
