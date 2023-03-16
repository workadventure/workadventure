import type { AreaData } from "../../types";
import type { GameMap } from "../../GameMap/GameMap";
import { Command } from "../Command";
import type { CreateAreaCommandConfig } from "./CreateAreaCommand";

export interface DeleteAreaCommandConfig {
    type: "DeleteAreaCommand";
    id: string;
}

export class DeleteAreaCommand extends Command {
    private areaConfig: AreaData;

    private gameMap: GameMap;

    constructor(gameMap: GameMap, config: DeleteAreaCommandConfig, commandId?: string) {
        super(commandId);
        this.gameMap = gameMap;
        const areaConfig = gameMap.getGameMapAreas()?.getArea(config.id);
        if (!areaConfig) {
            throw new Error("Trying to delete a non existing Area!");
        }
        this.areaConfig = structuredClone(areaConfig);
    }

    public execute(): DeleteAreaCommandConfig {
        if (!this.gameMap.getGameMapAreas()?.deleteAreaById(this.areaConfig.id)) {
            throw new Error(`MapEditorError: Could not execute DeleteArea Command. Area ID: ${this.areaConfig.id}`);
        }
        return { type: "DeleteAreaCommand", id: this.areaConfig.id };
    }

    public undo(): CreateAreaCommandConfig {
        if (!this.gameMap.getGameMapAreas()?.addArea(this.areaConfig)) {
            throw new Error(`MapEditorError: Could not undo DeleteArea Command. Area ID: ${this.areaConfig.id}`);
        }
        return { type: "CreateAreaCommand", areaObjectConfig: this.areaConfig };
    }
}
