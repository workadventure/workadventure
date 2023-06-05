import { Command, CreateEntityCommand, GameMap, WAMEntityData } from "@workadventure/map-editor";
import { EntitiesManager } from "../../../GameMap/EntitiesManager";
import { FrontCommandInterface } from "../FrontCommandInterface";
import { RoomConnection } from "../../../../../Connexion/RoomConnection";
import { DeleteEntityFrontCommand } from "./DeleteEntityFrontCommand";

export class CreateEntityFrontCommand extends CreateEntityCommand implements FrontCommandInterface {
    constructor(
        gameMap: GameMap,
        entityData: WAMEntityData,
        commandId: string | undefined,
        private entitiesManager: EntitiesManager
    ) {
        super(gameMap, entityData, commandId);
    }

    public async execute(): Promise<void> {
        const returnVal = super.execute();
        await this.entitiesManager.addEntity(structuredClone(this.entityData), undefined, true);

        return returnVal;
    }

    public getUndoCommand(): Command & DeleteEntityFrontCommand {
        return new DeleteEntityFrontCommand(this.gameMap, this.entityData.id, undefined, this.entitiesManager);
    }

    public emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitMapEditorCreateEntity(this.id, this.entityData);
    }
}
