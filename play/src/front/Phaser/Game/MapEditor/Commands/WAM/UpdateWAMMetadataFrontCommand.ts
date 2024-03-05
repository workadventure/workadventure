import { Command, WAMFileFormat } from "@workadventure/map-editor";
import { ModifiyWAMMetadataMessage } from "@workadventure/messages";
import { FrontCommandInterface } from "../FrontCommandInterface";
import { RoomConnection } from "../../../../../Connection/RoomConnection";

/**
 * Represents a front command for updating WAM metadata.
 */
export class UpdateWAMMetadataFrontCommand extends Command implements FrontCommandInterface {
    constructor(private readonly modifiyWAMMetadataMessage: ModifiyWAMMetadataMessage, commandId?: string) {
        super(commandId);
    }

    /**
     * Gets the undo command for updating WAM metadata.
     * @returns The undo command.
     */
    public getUndoCommand(): UpdateWAMMetadataFrontCommand {
        return new UpdateWAMMetadataFrontCommand(this.modifiyWAMMetadataMessage, this.commandId);
    }

    /**
     * Emits an event to modify WAM metadata.
     * @param roomConnection - The room connection.
     */
    public emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitModifiyWAMMetadataMessage(this.commandId, this.modifiyWAMMetadataMessage);
    }

    /**
     * Executes the command to update WAM metadata.
     * @returns A promise that resolves when the command is executed.
     */
    public execute(): Promise<void | undefined | WAMFileFormat> {
        console.warn("UpdateWAMMetadataFrontCommand.execute() is not implemented");
        return Promise.resolve(undefined);
    }
}
