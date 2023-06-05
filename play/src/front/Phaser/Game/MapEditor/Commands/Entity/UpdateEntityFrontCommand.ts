import { AtLeast, Command, EntityData, GameMap, UpdateEntityCommand } from "@workadventure/map-editor";
import { EntitiesManager } from "../../../GameMap/EntitiesManager";
import { Entity } from "../../../../ECS/Entity";
import { GameScene } from "../../../GameScene";
import { FrontCommandInterface } from "../FrontCommandInterface";
import { RoomConnection } from "../../../../../Connexion/RoomConnection";

export class UpdateEntityFrontCommand extends UpdateEntityCommand implements FrontCommandInterface {
    constructor(
        gameMap: GameMap,
        dataToModify: AtLeast<EntityData, "id">,
        commandId: string | undefined,
        oldConfig: AtLeast<EntityData, "id"> | undefined,
        private entitiesManager: EntitiesManager,
        private scene: GameScene
    ) {
        super(gameMap, dataToModify, commandId, oldConfig);
    }

    public execute(): Promise<void> {
        const returnVal = super.execute();
        this.handleEntityUpdate(this.newConfig);

        return returnVal;
    }

    private handleEntityUpdate(config: AtLeast<EntityData, "id">): void {
        const entity = this.entitiesManager.getEntities().get(config.id);
        if (!entity) {
            return;
        }
        const { x: oldX, y: oldY } = entity.getOldPosition();
        entity?.updateEntity(config);
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

    public getUndoCommand(): Command & FrontCommandInterface {
        return new UpdateEntityFrontCommand(
            this.gameMap,
            this.oldConfig,
            undefined,
            this.newConfig,
            this.entitiesManager,
            this.scene
        );
    }
    public emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitMapEditorModifyEntity(this.id, this.newConfig);
    }
}
