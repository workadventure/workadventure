import { CreateEntityCommand, EntityDimensions, GameMap, WAMEntityData } from "@workadventure/map-editor";
import { EntitiesManager } from "../../../GameMap/EntitiesManager";
import { FrontCommandInterface } from "../FrontCommandInterface";
import { RoomConnection } from "../../../../../Connection/RoomConnection";
import { DeleteEntityFrontCommand } from "./DeleteEntityFrontCommand";

export class CreateEntityFrontCommand extends CreateEntityCommand implements FrontCommandInterface {
    constructor(
        gameMap: GameMap,
        entityId: string | undefined,
        entityData: WAMEntityData,
        commandId: string | undefined,
        private entitiesManager: EntitiesManager,
        private entityDimensions: EntityDimensions
    ) {
        super(gameMap, entityId, entityData, commandId);
    }

    public async execute(): Promise<void> {
        const returnVal = super.execute();
        await this.entitiesManager.addEntity(this.entityId, structuredClone(this.entityData), undefined, true);

        return returnVal;
    }

    public getUndoCommand(): DeleteEntityFrontCommand {
        return new DeleteEntityFrontCommand(this.gameMap, this.entityId, undefined, this.entitiesManager);
    }

    public emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitMapEditorCreateEntity(this.commandId, this.entityId, this.entityData, this.entityDimensions);
    }
}
