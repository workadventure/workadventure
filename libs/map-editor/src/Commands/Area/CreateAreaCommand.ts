import type { AreaData } from "../../types";
import type { GameMap } from "../../GameMap/GameMap";
import { Command } from "../Command";
import type { DeleteAreaCommandConfig } from "./DeleteAreaCommand";

export interface CreateAreaCommandConfig {
    type: "CreateAreaCommand";
    areaObjectConfig: AreaData;
}

export class CreateAreaCommand extends Command {
    private readonly areaConfig: AreaData;

    private gameMap: GameMap;

    constructor(gameMap: GameMap, config: CreateAreaCommandConfig, commandId?: string) {
        super(commandId);
        this.gameMap = gameMap;
        this.areaConfig = structuredClone<AreaData>(config.areaObjectConfig);
    }

    public execute(): CreateAreaCommandConfig {
        if (!this.gameMap.getGameMapAreas()?.addArea(this.areaConfig)) {
            throw new Error(`MapEditorError: Could not execute CreateArea Command. Area ID: ${this.areaConfig.id}`);
        }
        return { type: "CreateAreaCommand", areaObjectConfig: this.areaConfig };
    }

    public undo(): DeleteAreaCommandConfig {
        if (!this.gameMap.getGameMapAreas()?.deleteAreaById(this.areaConfig.id)) {
            throw new Error(`MapEditorError: Could not undo CreateArea Command. Area ID: ${this.areaConfig.id}`);
        }
        return { type: "DeleteAreaCommand", id: this.areaConfig.id };
    }
}
