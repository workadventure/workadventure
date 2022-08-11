import { CommandConfig } from '../types';

export abstract class Command {
    constructor() {}

    public abstract execute(): CommandConfig;
    public abstract undo(): CommandConfig;
}
