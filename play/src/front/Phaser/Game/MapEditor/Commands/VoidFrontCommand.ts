import { Command } from "@workadventure/map-editor";
import { RoomConnection } from "../../../../Connection/RoomConnection";
import { FrontCommandInterface } from "./FrontCommandInterface";

export class VoidFrontCommand extends Command implements FrontCommandInterface {
    public execute(): Promise<void> {
        return Promise.resolve();
    }

    public getUndoCommand(): Command & FrontCommandInterface {
        return this;
    }

    public emitEvent(roomConnection: RoomConnection): void {
        // Do nothing
    }
}
