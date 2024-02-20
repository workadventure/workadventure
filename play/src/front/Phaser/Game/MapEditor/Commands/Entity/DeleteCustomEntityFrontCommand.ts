import { Command, DeleteCustomEntityCommand, GameMap } from "@workadventure/map-editor";
import { DeleteCustomEntityMessage } from "@workadventure/messages";
import { RoomConnection } from "../../../../../Connection/RoomConnection";
import { FrontCommand } from "../FrontCommand";
import { gameManager } from "../../../GameManager";
import { EntitiesManager } from "../../../GameMap/EntitiesManager";

export class DeleteCustomEntityFrontCommand extends DeleteCustomEntityCommand implements FrontCommand {
    constructor(
        deleteCustomEntityMessage: DeleteCustomEntityMessage,
        gameMap: GameMap,
        private entitiesManager: EntitiesManager
    ) {
        super(deleteCustomEntityMessage, gameMap);
    }

    emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitMapEditorDeleteCustomEntity(this.commandId, this.deleteCustomEntityMessage);
    }

    execute(): Promise<void> {
        const { id } = this.deleteCustomEntityMessage;
        gameManager.getCurrentGameScene().getEntitiesCollectionsManager().deleteCustomEntity(id);
        const gameMapEntitiesIdToRemove =
            this.gameMap?.getGameMapEntities()?.getCustomEntitiesKeysByCustomEntityId(id) ?? [];
        this.entitiesManager.deleteEntities(gameMapEntitiesIdToRemove);
        return super.execute();
    }

    getUndoCommand(): Command & FrontCommand {
        throw new Error("Not supported.");
    }
}
