import { ITiledMapProperty, Json } from "@workadventure/tiled-map-type-guard";
import _ from "lodash";
import { EntityData } from "../types";
import type { GameMap } from "./GameMap";

export class GameMapEntities {
    private gameMap: GameMap;

    private entities: Map<string, EntityData> = new Map<string, EntityData>();

    private readonly MAP_PROPERTY_ENTITIES_NAME: string = "entities";

    constructor(gameMap: GameMap) {
        this.gameMap = gameMap;

        const entitiesData: unknown = structuredClone(this.getEntitiesMapProperty()?.value ?? []);

        for (const entityData of (entitiesData as EntityData[]) ?? []) {
            this.addEntity(entityData, false);
        }
    }

    public addEntity(entityData: EntityData, addToMapProperties = true): boolean {
        if (this.entities.has(entityData.id)) {
            return false;
        }
        this.entities.set(entityData.id, entityData);
        if (addToMapProperties) {
            return this.addEntityToMapProperties(entityData);
        }
        return true;
    }

    public getEntity(id: string): EntityData | undefined {
        return this.entities.get(id);
    }

    public deleteEntity(id: string): boolean {
        const deleted = this.entities.delete(id);
        if (deleted) {
            return this.deleteEntityFromMapProperties(id);
        }
        return false;
    }

    public updateEntity(id: string, config: Partial<EntityData>): EntityData {
        const entity = this.getEntity(id);
        if (!entity) {
            throw new Error(`Entity of id: ${id} does not exists!`);
        }
        _.merge(entity, config);
        this.updateEntityInMapProperties(entity);
        return entity;
    }

    private addEntityToMapProperties(entityData: EntityData): boolean {
        if (this.gameMap.getMap().properties === undefined) {
            this.gameMap.getMap().properties = [];
        }
        if (!this.getEntitiesMapProperty()) {
            this.gameMap.getMap().properties?.push({
                name: this.MAP_PROPERTY_ENTITIES_NAME,
                type: "class",
                value: JSON.parse(JSON.stringify([])) as Json,
            });
        }
        const entitiesPropertyValues = JSON.parse(JSON.stringify(this.getEntitiesMapProperty()?.value)) as EntityData[];

        if (entitiesPropertyValues.find((entity) => entity.id === entityData.id)) {
            console.warn(`ADD ENTITY FAIL: ENTITY OF ID ${entityData.id} ALREADY EXISTS WITHIN THE GAMEMAP!`);
            return false;
        }
        entitiesPropertyValues.push(entityData);

        const entitiesMapProperty = this.getEntitiesMapProperty();
        if (entitiesMapProperty !== undefined) {
            entitiesMapProperty.value = structuredClone(entitiesPropertyValues) as unknown as Json;
        }

        return true;
    }

    private deleteEntityFromMapProperties(id: string): boolean {
        const entitiesPropertyValues = JSON.parse(JSON.stringify(this.getEntitiesMapProperty()?.value)) as EntityData[];
        const indexToRemove = entitiesPropertyValues.findIndex((entityData) => entityData.id === id);
        if (indexToRemove !== -1) {
            entitiesPropertyValues.splice(indexToRemove, 1);
            const entitiesMapProperty = this.getEntitiesMapProperty();
            if (entitiesMapProperty !== undefined) {
                entitiesMapProperty.value = JSON.parse(JSON.stringify(entitiesPropertyValues)) as Json;
                return true;
            } else {
                return false;
            }
        }
        return false;
    }

    private updateEntityInMapProperties(entityData: EntityData): boolean {
        const entitiesPropertyValue = this.getEntitiesMapProperty()?.value as unknown as EntityData[];

        const entityIndex = entitiesPropertyValue.findIndex((entity) => entity.id === entityData.id);

        if (entityIndex === -1) {
            console.warn(`CANNOT FIND ENTITY WITH ID: ${entityData.id} IN MAP PROPERTIES!`);
            return false;
        }

        const entitiesMapProperty = this.getEntitiesMapProperty();
        if (entitiesMapProperty !== undefined) {
            entitiesPropertyValue[entityIndex] = entityData;
            entitiesMapProperty.value = JSON.parse(JSON.stringify(entitiesPropertyValue)) as Json;
            return true;
        }
        return false;
    }

    private getEntitiesMapProperty(): ITiledMapProperty | undefined {
        return this.gameMap.getMapPropertyByKey(this.MAP_PROPERTY_ENTITIES_NAME);
    }

    public getEntities(): EntityData[] {
        return Array.from(this.entities.values());
    }
}
