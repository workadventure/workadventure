import { Command, DeleteEntityCommand, GameMap, WAMEntityData } from "@workadventure/map-editor";
import { EntitiesManager } from "../../../GameMap/EntitiesManager";
import { FrontCommandInterface } from "../FrontCommandInterface";
import { RoomConnection } from "../../../../../Connexion/RoomConnection";
import { CreateEntityFrontCommand } from "./CreateEntityFrontCommand";

export class DeleteEntityFrontCommand extends DeleteEntityCommand implements FrontCommandInterface {
    private entityData: WAMEntityData;

    constructor(
        gameMap: GameMap,
        entityId: string,
        commandId: string | undefined,
        private entitiesManager: EntitiesManager
    ) {
        super(gameMap, entityId, commandId);
        const entityData = gameMap.getGameMapEntities()?.getEntity(entityId);
        if (!entityData) {
            void this.execute();
            throw new Error("Trying to delete a non existing Entity!");
        }
        this.entityData = structuredClone(entityData);
    }

    public execute(): Promise<void> {
        this.entitiesManager.deleteEntity(this.entityId);
        return super.execute();
    }

    public getUndoCommand(): Command & CreateEntityFrontCommand {
        return new CreateEntityFrontCommand(this.gameMap, undefined, this.entityData, undefined, this.entitiesManager);
    }

    public emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitMapEditorDeleteEntity(this.id, this.entityId);
    }
}
