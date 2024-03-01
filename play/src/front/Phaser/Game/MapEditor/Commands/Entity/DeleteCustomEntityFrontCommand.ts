import { Command, DeleteCustomEntityCommand, GameMap } from "@workadventure/map-editor";
import { DeleteCustomEntityMessage } from "@workadventure/messages";
import { RoomConnection } from "../../../../../Connection/RoomConnection";
import { FrontCommand } from "../FrontCommand";
import { EntitiesManager } from "../../../GameMap/EntitiesManager";
import { EntitiesCollectionsManager } from "../../EntitiesCollectionsManager";

export class DeleteCustomEntityFrontCommand extends DeleteCustomEntityCommand implements FrontCommand {
    constructor(
        deleteCustomEntityMessage: DeleteCustomEntityMessage,
        gameMap: GameMap,
        private entitiesManager: EntitiesManager,
        private entitiesCollectionManager: EntitiesCollectionsManager
    ) {
        super(deleteCustomEntityMessage, gameMap);
    }

    emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitMapEditorDeleteCustomEntity(this.commandId, this.deleteCustomEntityMessage);
    }

    execute(): Promise<void> {
        const { id } = this.deleteCustomEntityMessage;
        this.entitiesCollectionManager.deleteCustomEntity(id);
        const gameMapEntitiesIdToRemove = this.gameMap?.getGameMapEntities()?.findEntitiesByPrefabId(id) ?? [];
        this.entitiesManager.deleteEntities(gameMapEntitiesIdToRemove);
        return super.execute();
    }

    getUndoCommand(): Command & FrontCommand {
        throw new Error("Not supported.");
    }
}
