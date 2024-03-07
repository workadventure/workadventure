import { DeleteCustomEntityMessage } from "@workadventure/messages";
import { Command } from "../Command";
import type { GameMap } from "../../GameMap/GameMap";

export class DeleteCustomEntityCommand extends Command {
    protected deleteCustomEntityMessage: DeleteCustomEntityMessage;
    protected hostname: string | undefined;
    protected gameMap: GameMap | undefined;

    constructor(deleteCustomEntityMessage: DeleteCustomEntityMessage, gameMap?: GameMap, hostname?: string) {
        super();
        this.deleteCustomEntityMessage = deleteCustomEntityMessage;
        this.hostname = hostname;
        this.gameMap = gameMap;
    }

    execute(): Promise<void> {
        this.gameMap?.getGameMapEntities()?.deleteCustomEntities(this.deleteCustomEntityMessage.id);
        return Promise.resolve();
    }
}
