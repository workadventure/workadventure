import { Command, DeleteEntityCommand, GameMap } from "@workadventure/map-editor";
import { EntitiesManager } from "../../../GameMap/EntitiesManager";
import { FrontCommandInterface } from "../FrontCommandInterface";
import { RoomConnection } from "../../../../../Connexion/RoomConnection";
import { CreateEntityFrontCommand } from "./CreateEntityFrontCommand";

export class DeleteEntityFrontCommand extends DeleteEntityCommand implements FrontCommandInterface {
    constructor(gameMap: GameMap, id: string, commandId: string | undefined, private entitiesManager: EntitiesManager) {
        super(gameMap, id, commandId);
    }

    public execute(): Promise<void> {
        this.entitiesManager.deleteEntity(this.entityData.id);
        return super.execute();
    }

    public getUndoCommand(): Command & CreateEntityFrontCommand {
        return new CreateEntityFrontCommand(this.gameMap, this.entityData, undefined, this.entitiesManager);
    }

    public emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitMapEditorDeleteEntity(this.id, this.entityData.id);
    }
}
