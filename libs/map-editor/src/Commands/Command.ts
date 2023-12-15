import { v4 as uuidv4 } from "uuid";

export abstract class Command {
    public readonly commandId: string;

    constructor(commandId?: string) {
        this.commandId = commandId ?? uuidv4();
    }

    public abstract execute(): Promise<void>;
    //public abstract undo(): Promise<void>;
}
