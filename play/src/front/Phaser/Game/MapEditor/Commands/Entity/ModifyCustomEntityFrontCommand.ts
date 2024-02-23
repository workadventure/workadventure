import { ModifyCustomEntityCommand } from "@workadventure/map-editor";
import { ModifyCustomEntityMessage } from "@workadventure/messages";
import { RoomConnection } from "../../../../../Connection/RoomConnection";
import { FrontCommand } from "../FrontCommand";
import { gameManager } from "../../../GameManager";

export class ModifyCustomEntityFrontCommand extends ModifyCustomEntityCommand implements FrontCommand {
    constructor(modifyCustomEntityMessage: ModifyCustomEntityMessage) {
        super(modifyCustomEntityMessage);
    }

    emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitMapEditorModifyCustomEntity(this.commandId, this.modifyCustomEntityMessage);
    }

    execute(): Promise<void> {
        const { id, name, tags, depthOffset, collisionGrid } = this.modifyCustomEntityMessage;
        gameManager
            .getCurrentGameScene()
            .getEntitiesCollectionsManager()
            .modifyCustomEntity(id, name, tags, depthOffset, collisionGrid);
        gameManager.getCurrentGameScene().getGameMapFrontWrapper().recomputeEntitiesCollisionGrid();
        return super.execute();
    }

    getUndoCommand(): ModifyCustomEntityFrontCommand {
        throw new Error("Not supported.");
    }
}
