import { v4 as uuidv4 } from "uuid";

export abstract class Command {
    public readonly id: string;

    constructor(id?: string) {
        this.id = id ?? uuidv4();
    }

    public abstract execute(): Promise<void>;
    //public abstract undo(): Promise<void>;
}
