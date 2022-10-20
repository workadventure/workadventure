import { v4 as uuidv4 } from "uuid";
import { CommandConfig } from '../types';

export abstract class Command {

    public readonly id: string;

    constructor() {
        this.id = uuidv4();
    }

    public abstract execute(): CommandConfig;
    public abstract undo(): CommandConfig;
}
