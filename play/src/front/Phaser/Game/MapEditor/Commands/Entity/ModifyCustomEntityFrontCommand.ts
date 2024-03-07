import { ModifyCustomEntityCommand } from "@workadventure/map-editor";
import { ModifyCustomEntityMessage } from "@workadventure/messages";
import { RoomConnection } from "../../../../../Connection/RoomConnection";
import { FrontCommand } from "../FrontCommand";
import { EntitiesCollectionsManager } from "../../EntitiesCollectionsManager";
import { GameMapFrontWrapper } from "../../../GameMap/GameMapFrontWrapper";
import { EntitiesManager } from "../../../GameMap/EntitiesManager";

export class ModifyCustomEntityFrontCommand extends ModifyCustomEntityCommand implements FrontCommand {
    constructor(
        modifyCustomEntityMessage: ModifyCustomEntityMessage,
        private entitiesCollectionManager: EntitiesCollectionsManager,
        private gameFrontWrapper: GameMapFrontWrapper,
        private entitiesManager: EntitiesManager
    ) {
        super(modifyCustomEntityMessage);
    }

    emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitMapEditorModifyCustomEntity(this.commandId, this.modifyCustomEntityMessage);
    }

    execute(): Promise<void> {
        const { id, name, tags, depthOffset, collisionGrid } = this.modifyCustomEntityMessage;
        this.entitiesCollectionManager.modifyCustomEntity(id, name, tags, depthOffset, collisionGrid);
        if (depthOffset !== undefined) {
            this.entitiesManager.updateEntitiesDepth(id, depthOffset);
        }
        this.gameFrontWrapper.recomputeEntitiesCollisionGrid();
        return super.execute();
    }

    getUndoCommand(): ModifyCustomEntityFrontCommand {
        throw new Error("Not supported.");
    }
}
