import { CommandPayload, CommandType } from '../MapEditorModeManager';

export abstract class Command {
    constructor() {}

    public abstract execute(): [CommandType, CommandPayload];
    public abstract undo(): [CommandType, CommandPayload];
}
