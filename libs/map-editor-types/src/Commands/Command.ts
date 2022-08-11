import { CommandPayload, CommandType } from '../types';

export abstract class Command {
    constructor() {}

    public abstract execute(): [CommandType, CommandPayload];
    public abstract undo(): [CommandType, CommandPayload];
}
