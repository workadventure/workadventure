import { ModifyCustomEntityMessage } from "@workadventure/messages";
import { Command } from "../Command";

export class ModifyCustomEntityCommand extends Command {
    protected modifyCustomEntityMessage: ModifyCustomEntityMessage;
    protected hostname: string | undefined;
    constructor(modifyCustomEntityMessage: ModifyCustomEntityMessage, hostname?: string) {
        super();
        this.modifyCustomEntityMessage = modifyCustomEntityMessage;
        this.hostname = hostname;
    }

    execute(): Promise<void> {
        return Promise.resolve();
    }
}
