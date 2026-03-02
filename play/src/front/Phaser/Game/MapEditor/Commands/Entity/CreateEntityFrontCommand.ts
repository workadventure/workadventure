import type { EntityDimensions, WamFile, WAMEntityData } from "@workadventure/map-editor";
import { CreateEntityCommand } from "@workadventure/map-editor";
import type { EntitiesManager } from "../../../GameMap/EntitiesManager";
import type { FrontCommandInterface } from "../FrontCommandInterface";
import type { RoomConnection } from "../../../../../Connection/RoomConnection";
import { DeleteEntityFrontCommand } from "./DeleteEntityFrontCommand";

export class CreateEntityFrontCommand extends CreateEntityCommand implements FrontCommandInterface {
    constructor(
        wamFile: WamFile,
        entityId: string | undefined,
        entityData: WAMEntityData,
        commandId: string | undefined,
        private entitiesManager: EntitiesManager,
        private entityDimensions: EntityDimensions
    ) {
        super(wamFile, entityId, entityData, commandId);
    }

    public async execute(): Promise<void> {
        const returnVal = super.execute();
        await this.entitiesManager.addEntity(this.entityId, structuredClone(this.entityData), undefined, true);

        return returnVal;
    }

    public getUndoCommand(): DeleteEntityFrontCommand {
        return new DeleteEntityFrontCommand(this.wamFile, this.entityId, undefined, this.entitiesManager);
    }

    public emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitMapEditorCreateEntity(this.commandId, this.entityId, this.entityData, this.entityDimensions);
    }
}
