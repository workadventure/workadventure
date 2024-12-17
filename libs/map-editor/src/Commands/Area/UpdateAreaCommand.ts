import { AreaData, AreaDataProperties, AreaDataPropertiesKeys, AreaDataProperty, AtLeast } from "../../types";
import type { GameMap } from "../../GameMap/GameMap";
import { Command } from "../Command";

export class UpdateAreaCommand extends Command {
    protected oldConfig: AtLeast<AreaData, "id">;
    protected newConfig: AtLeast<AreaData, "id">;

    protected gameMap: GameMap;

    constructor(
        gameMap: GameMap,
        dataToModify: AtLeast<AreaData, "id">,
        commandId?: string,
        oldConfig?: AtLeast<AreaData, "id">
    ) {
        super(commandId);
        this.gameMap = gameMap;
        if (!oldConfig) {
            const oldConfig = gameMap.getGameMapAreas()?.getArea(dataToModify.id);
            if (!oldConfig) {
                throw new Error("Trying to update a non existing Area!");
            }
            try {
                this.oldConfig = structuredClone(oldConfig);
            } catch (e) {
                throw new Error(String(e));
            }
        } else {
            this.oldConfig = oldConfig;
        }
        try {
            this.newConfig = structuredClone(this.parseDataToModify(dataToModify));
        } catch (e) {
            throw new Error(String(e));
        }
    }

    public execute(): Promise<void> {
        if (!this.gameMap.getGameMapAreas()?.updateArea(this.newConfig)) {
            throw new Error(`MapEditorError: Could not execute UpdateArea Command. Area ID: ${this.newConfig.id}`);
        }
        return Promise.resolve();
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
        const singleOnly: AreaDataPropertiesKeys[] = [
            "start",
            "focusable",
            "silent",
            "jitsiRoomProperty",
            "personalAreaPropertyData",
            "restrictedRightsPropertyData",
            "matrixRoomPropertyData",
            "tooltipPropertyData",
        ];
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
        return validData.filter((property: AreaDataProperty) => !propertiesToRemove.includes(property.id));
    }
}
