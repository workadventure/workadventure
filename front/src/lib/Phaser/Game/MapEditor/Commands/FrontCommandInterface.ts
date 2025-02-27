import { Command } from "@workadventure/map-editor";
import { RoomConnection } from "../../../../Connection/RoomConnection";

/**
 * Commands implementing this interface will be able to emit an event to the Pusher and generate an undo command
 */
export interface FrontCommandInterface {
    getUndoCommand(): Command & FrontCommandInterface;

    emitEvent(roomConnection: RoomConnection): void;
}
