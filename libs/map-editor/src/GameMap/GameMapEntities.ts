import merge from "lodash/merge";
import { WAMEntityData, WAMFileFormat } from "../types";

export class GameMapEntities {
    private wam: WAMFileFormat;

    constructor(wam: WAMFileFormat) {
        this.wam = wam;
    }

    public addEntity(entityId: string, entityData: WAMEntityData): boolean {
        if (this.wam.entities[entityId] !== undefined) {
            return false;
        }
        this.wam.entities[entityId] = entityData;
        return true;
    }

    public getEntity(id: string): WAMEntityData | undefined {
        return this.wam.entities[id];
    }

    public deleteEntity(id: string): boolean {
        if (this.wam.entities[id] === undefined) {
            return false;
        }
        delete this.wam.entities[id];
        return true;
    }

    public deleteCustomEntities(id: string): boolean {
        const customEntitiesOnMapKeysToRemove = this.findEntitiesByPrefabId(id);
        if (customEntitiesOnMapKeysToRemove.length === 0) {
            return false;
        }
        customEntitiesOnMapKeysToRemove.forEach((entityMapKey) => delete this.wam.entities[entityMapKey]);
        return true;
    }

    public updateEntity(id: string, config: Partial<WAMEntityData>): WAMEntityData {
        const entity = this.getEntity(id);
        if (!entity) {
            throw new Error(`Entity of id: ${id} does not exist!`);
        }
        merge(entity, config);
        // TODO: Find a way to update it without need of using conditions
        if (config.properties !== undefined) {
            entity.properties = config.properties;
        }

        return entity;
    }

    public getEntities(): Record<string, WAMEntityData> {
        return this.wam.entities;
    }

    public findEntitiesByPrefabId(customEntityId: string): string[] {
        return Object.keys(this.wam.entities).filter(
            (entityMapKey) => this.wam.entities[entityMapKey].prefabRef.id === customEntityId
        );
    }

    get wamFile(): WAMFileFormat {
        return this.wam;
    }
}
