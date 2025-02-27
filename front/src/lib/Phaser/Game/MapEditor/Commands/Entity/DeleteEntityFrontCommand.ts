import { DeleteEntityCommand, GameMap, WAMEntityData } from "@workadventure/map-editor";
import { EntitiesManager } from "../../../GameMap/EntitiesManager";
import { FrontCommandInterface } from "../FrontCommandInterface";
import { RoomConnection } from "../../../../../Connection/RoomConnection";
import { VoidFrontCommand } from "../VoidFrontCommand";
import { CreateEntityFrontCommand } from "./CreateEntityFrontCommand";

export class DeleteEntityFrontCommand extends DeleteEntityCommand implements FrontCommandInterface {
    private entityData: WAMEntityData | undefined;

    constructor(
        gameMap: GameMap,
        entityId: string,
        commandId: string | undefined,
        private entitiesManager: EntitiesManager
    ) {
        super(gameMap, entityId, commandId);
    }

    public execute(): Promise<void> {
        const entityData = this.gameMap.getGameMapEntities()?.getEntity(this.entityId);
        if (!entityData) {
            throw new Error("Trying to delete a non existing Entity!");
        }
        this.entityData = structuredClone(entityData);
        this.entitiesManager.deleteEntity(this.entityId);
        return super.execute();
    }

    public getUndoCommand(): CreateEntityFrontCommand | VoidFrontCommand {
        if (!this.entityData) {
            return new VoidFrontCommand();
        }
        const entity = this.entitiesManager.getEntities().get(this.entityData.prefabRef.id);
        if (!entity) {
            return new VoidFrontCommand();
        }
        return new CreateEntityFrontCommand(
            this.gameMap,
            this.entityId,
            this.entityData,
            undefined,
            this.entitiesManager,
            { width: entity.width, height: entity.height }
        );
    }

    public emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitMapEditorDeleteEntity(this.commandId, this.entityId);
    }
}
