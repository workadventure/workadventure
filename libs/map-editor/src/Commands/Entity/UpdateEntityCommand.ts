import type { WAMEntityData, WAMFileFormat } from "../../types";
import type { GameMap } from "../../GameMap/GameMap";
import { Command } from "../Command";

export class UpdateEntityCommand extends Command {
    protected oldConfig: Partial<WAMEntityData>;
    protected newConfig: Partial<WAMEntityData>;

    protected gameMap: GameMap;

    constructor(
        gameMap: GameMap,
        protected entityId: string,
        dataToModify: Partial<WAMEntityData>,
        commandId?: string,
        oldConfig?: Partial<WAMEntityData>
    ) {
        super(commandId);
        this.gameMap = gameMap;
        if (!oldConfig) {
            const oldConfig = gameMap.getGameMapEntities()?.getEntity(entityId);
            if (!oldConfig) {
                throw new Error("Trying to update a non existing Entity!");
            }
            this.oldConfig = structuredClone(oldConfig);
        } else {
            this.oldConfig = structuredClone(oldConfig);
        }
        this.newConfig = structuredClone(dataToModify);
    }

    public execute(): Promise<undefined | WAMFileFormat> {
        if (!this.gameMap.getGameMapEntities()?.updateEntity(this.entityId, this.newConfig)) {
            throw new Error(`MapEditorError: Could not execute UpdateEntity Command. Entity ID: ${this.entityId}`);
        }
        return Promise.resolve(this.gameMap.getGameMapEntities()?.wamFile);
    }
}
