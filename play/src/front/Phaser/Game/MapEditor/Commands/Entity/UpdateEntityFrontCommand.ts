import type { GameMap, WAMEntityData, WAMFileFormat } from "@workadventure/map-editor";
import { UpdateEntityCommand } from "@workadventure/map-editor";
import type { EntitiesManager } from "../../../GameMap/EntitiesManager";
import type { Entity } from "../../../../ECS/Entity";
import type { GameScene } from "../../../GameScene";
import type { FrontCommandInterface } from "../FrontCommandInterface";
import type { RoomConnection } from "../../../../../Connection/RoomConnection";

export class UpdateEntityFrontCommand extends UpdateEntityCommand implements FrontCommandInterface {
    constructor(
        gameMap: GameMap,
        entityId: string,
        dataToModify: Partial<WAMEntityData>,
        commandId: string | undefined,
        oldConfig: Partial<WAMEntityData> | undefined,
        private entitiesManager: EntitiesManager,
        private scene: GameScene
    ) {
        super(gameMap, entityId, dataToModify, commandId, oldConfig);
    }

    public execute(): Promise<WAMFileFormat | undefined> {
        const returnVal = super.execute();
        this.handleEntityUpdate(this.newConfig);

        return returnVal;
    }

    public getUndoCommand(): UpdateEntityFrontCommand {
        return new UpdateEntityFrontCommand(
            this.gameMap,
            this.entityId,
            this.oldConfig,
            undefined,
            this.newConfig,
            this.entitiesManager,
            this.scene
        );
    }

    public emitEvent(roomConnection: RoomConnection): void {
        const entity = this.entitiesManager.getEntities().get(this.entityId);
        if (!entity) {
            console.error("Entity not found");
            return;
        }
        roomConnection.emitMapEditorModifyEntity(
            this.commandId,
            this.entityId,
            {
                x: entity.x,
                y: entity.y,
                ...this.newConfig,
            },
            {
                width: entity.width,
                height: entity.height,
            }
        );
    }

    private handleEntityUpdate(config: Partial<WAMEntityData>): void {
        const entity = this.entitiesManager.getEntities().get(this.entityId);
        if (!entity) {
            return;
        }
        const { x: oldX, y: oldY } = entity.getOldPosition();
        entity?.updateEntity(config);
        // If the entity is activable, and not in the activatable entities array of the entity manager,
        // we add it to the array
        if (entity.isActivatable() && !this.entitiesManager.getActivatableEntities().includes(entity)) {
            this.entitiesManager.getActivatableEntities().push(entity);
        }
        this.updateCollisionGrid(entity, oldX, oldY);
        this.scene.markDirty();
    }

    private updateCollisionGrid(entity: Entity, oldX: number, oldY: number): void {
        const reversedGrid = entity.getReversedCollisionGrid();
        const grid = entity.getCollisionGrid();
        if (reversedGrid && grid) {
            this.scene.getGameMapFrontWrapper().modifyToCollisionsLayer(oldX, oldY, "0", reversedGrid);
            this.scene.getGameMapFrontWrapper().modifyToCollisionsLayer(entity.x, entity.y, "0", grid);
        }
    }
}
