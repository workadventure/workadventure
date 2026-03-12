import type { DeleteCustomEntityMessage } from "@workadventure/messages";
import { Command } from "../Command.ts";
import type { WamFile } from "../../GameMap/WamFile.ts";

export class DeleteCustomEntityCommand extends Command {
    protected deleteCustomEntityMessage: DeleteCustomEntityMessage;
    protected hostname: string | undefined;
    protected wamFile: WamFile | undefined;

    constructor(deleteCustomEntityMessage: DeleteCustomEntityMessage, wamFile?: WamFile, hostname?: string) {
        super();
        this.deleteCustomEntityMessage = deleteCustomEntityMessage;
        this.hostname = hostname;
        this.wamFile = wamFile;
    }

    execute(): Promise<void> {
        this.wamFile?.getGameMapEntities().deleteCustomEntities(this.deleteCustomEntityMessage.id);
        return Promise.resolve();
    }
}
