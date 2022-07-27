export abstract class Command {
    constructor() {}

    public abstract execute(): void;
    public abstract undo(): void;
}
