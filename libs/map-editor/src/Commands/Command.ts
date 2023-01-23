import { v4 as uuidv4 } from "uuid";
import type { CommandConfig } from "../types";

export abstract class Command {
    public readonly id: string;

    constructor(id?: string) {
        this.id = id ?? uuidv4();
    }

    public abstract execute(): CommandConfig;
    public abstract undo(): CommandConfig;
}
