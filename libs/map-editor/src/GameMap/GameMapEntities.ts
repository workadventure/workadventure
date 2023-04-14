import _ from "lodash";
import { EntityData, WAMFileFormat } from "../types";

export class GameMapEntities {
    private wam: WAMFileFormat;

    private entities: Map<string, EntityData> = new Map<string, EntityData>();

    private readonly MAP_PROPERTY_ENTITIES_NAME: string = "entities";

    constructor(wam: WAMFileFormat) {
        this.wam = wam;

        for (const entityData of this.wam.entities) {
            this.addEntity(entityData, false);
        }
    }

    public addEntity(entityData: EntityData, addToMapProperties = true): boolean {
        if (this.entities.has(entityData.id)) {
            return false;
        }
        this.entities.set(entityData.id, entityData);
        if (addToMapProperties) {
            return this.addEntityToWAM(entityData);
        }
        return true;
    }

    public getEntity(id: string): EntityData | undefined {
        return this.entities.get(id);
    }

    public deleteEntity(id: string): boolean {
        const deleted = this.entities.delete(id);
        if (deleted) {
            return this.deleteEntityFromWAM(id);
        }
        return false;
    }

    public updateEntity(id: string, config: Partial<EntityData>): EntityData {
        const entity = this.getEntity(id);
        if (!entity) {
            throw new Error(`Entity of id: ${id} does not exist!`);
        }
        _.merge(entity, config);
        // TODO: Find a way to update it without need of using conditions
        if (config.properties !== undefined) {
            entity.properties = config.properties;
        }
        this.updateEntityInWAM(entity);
        return entity;
    }

    private addEntityToWAM(entityData: EntityData): boolean {
        if (!this.wam.entities.find((entity) => entity.id === entityData.id)) {
            this.wam.entities.push(entityData);
        } else {
            console.warn(`ADD ENTITY FAIL: ENTITY OF ID ${entityData.id} ALREADY EXISTS WITHIN WAM FILE!`);
            return false;
        }
        return true;
    }

    private deleteEntityFromWAM(id: string): boolean {
        const indexToRemove = this.wam.entities.findIndex((entityData) => entityData.id === id);
        if (indexToRemove !== -1) {
            this.wam.entities.splice(indexToRemove, 1);
            return true;
        }
        return false;
    }

    private updateEntityInWAM(entityData: EntityData): boolean {
        const entityIndex = this.wam.entities.findIndex((entity) => entity.id === entityData.id);

        if (entityIndex === -1) {
            console.warn(`CANNOT FIND ENTITY WITH ID: ${entityData.id} IN WAM FILE!`);
            return false;
        }

        this.wam.entities[entityIndex] = entityData;
        return true;
    }

    public getEntities(): EntityData[] {
        return Array.from(this.entities.values());
    }
}
