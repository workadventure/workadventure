import type { AreaData } from "../../types.js.js";
import type { GameMap } from "../../GameMap/GameMap.js.js";
import { AreaType } from "../../types.js.js";
import { Command } from "../Command.js";
import type { CreateAreaCommandConfig } from "./CreateAreaCommand.js.js";

export interface DeleteAreaCommandConfig {
    type: "DeleteAreaCommand";
    id: number;
}

export class DeleteAreaCommand extends Command {
    private areaConfig: AreaData;

    private gameMap: GameMap;

    constructor(gameMap: GameMap, config: DeleteAreaCommandConfig) {
        super();
        this.gameMap = gameMap;
        const areaConfig = gameMap.getGameMapAreas().getArea(config.id, AreaType.Static);
        if (!areaConfig) {
            throw new Error('Trying to delete a non existing Area!');
        }
        this.areaConfig = structuredClone(areaConfig);
    }

    public execute(): DeleteAreaCommandConfig {
        if (!this.gameMap.getGameMapAreas().deleteAreaById(this.areaConfig.id, AreaType.Static)) {
            throw new Error(`MapEditorError: Could not execute DeleteArea Command. Area ID: ${this.areaConfig.id}`);
        }
        return { type: 'DeleteAreaCommand', id: this.areaConfig.id };
    }

    public undo(): CreateAreaCommandConfig {
        if (!this.gameMap.getGameMapAreas().addArea(this.areaConfig, AreaType.Static)) {
            throw new Error(`MapEditorError: Could not undo DeleteArea Command. Area ID: ${this.areaConfig.id}`);
        }
        return { type: 'CreateAreaCommand', areaObjectConfig: this.areaConfig };
    }
}
