import { AtLeast, AreaData, AreaDataProperties, AreaDataPropertiesKeys } from "../../types";
import type { GameMap } from "../../GameMap/GameMap";
import { Command } from "../Command";

export interface UpdateAreaCommandConfig {
    type: "UpdateAreaCommand";
    dataToModify: AtLeast<AreaData, "id">;
}

export class UpdateAreaCommand extends Command {
    private oldConfig: AtLeast<AreaData, "id">;
    private newConfig: AtLeast<AreaData, "id">;

    private gameMap: GameMap;

    constructor(gameMap: GameMap, config: UpdateAreaCommandConfig, commandId?: string) {
        super(commandId);
        this.gameMap = gameMap;
        const oldConfig = gameMap.getGameMapAreas()?.getArea(config.dataToModify.id);
        if (!oldConfig) {
            throw new Error("Trying to update a non existing Area!");
        }
        try {
            this.newConfig = structuredClone(this.parseDataToModify(config.dataToModify));
            this.oldConfig = structuredClone(oldConfig);
        } catch (e) {
            throw new Error(String(e));
        }
    }

    public execute(): UpdateAreaCommandConfig {
        if (!this.gameMap.getGameMapAreas()?.updateArea(this.newConfig.id, this.newConfig)) {
            throw new Error(`MapEditorError: Could not execute UpdateArea Command. Area ID: ${this.newConfig.id}`);
        }
        return { type: "UpdateAreaCommand", dataToModify: this.newConfig };
    }

    public undo(): UpdateAreaCommandConfig {
        if (!this.gameMap.getGameMapAreas()?.updateArea(this.oldConfig.id, this.oldConfig)) {
            throw new Error(`MapEditorError: Could not undo UpdateArea Command. Area ID: ${this.newConfig.id}`);
        }
        return { type: "UpdateAreaCommand", dataToModify: this.oldConfig };
    }

    private parseDataToModify(data: AtLeast<AreaData, "id">): AtLeast<AreaData, "id"> {
        if (!data) {
            throw new Error(`Data to modify Area ID: ${this.newConfig.id} is undefined!`);
        }
        const parsedData = structuredClone(data);
        if (parsedData.properties) {
            parsedData.properties = this.validateProperties(parsedData.properties, data.id);
        }
        return parsedData;
    }

    /**
     * There are certain properties that can be only used as singletons, for instance the "focusable" property.
     * or "jitsi" property. If we somehow try to pass properties array which is not valid, we will catch it here.
     */
    private validateProperties(data: AreaDataProperties, areaId: string): AreaDataProperties {
        const singleOnly: AreaDataPropertiesKeys[] = ["start", "focusable", "silent", "jitsiRoomProperty"];
        const foundKeys: AreaDataPropertiesKeys[] = [];
        const propertiesToRemove: string[] = [];
        for (const property of data) {
            if (!foundKeys.includes(property.type)) {
                foundKeys.push(property.type);
            } else if (singleOnly.includes(property.type)) {
                console.warn(
                    `MapEditorError: Area ID: ${areaId} has multiple properties of type ${property.type}. Removing to single property.`
                );
                propertiesToRemove.push(property.id);
            }
        }
        const validData = structuredClone(data);
        return validData.filter((property) => !propertiesToRemove.includes(property.id));
    }
}
