import type { PositionMessage } from "@workadventure/messages";

export interface HasPlayerMovedInterface extends PositionMessage {
    oldX?: number;
    oldY?: number;
}
