import { ITiledMapProperty } from '@workadventure/tiled-map-type-guard';
import _ from 'lodash';
import { EntityData } from '../types';
import type { GameMap } from './GameMap';

export class GameMapEntities {

    private gameMap: GameMap;

    private entities: EntityData[] = [];

    private nextEntityId: number = 0;

    private readonly MAP_PROPERTY_ENTITIES_NAME: string = 'entities';

    constructor(gameMap: GameMap) {
        this.gameMap = gameMap;

        for (const entityData of JSON.parse(JSON.stringify(this.getEntitiesMapProperty()?.value ?? [])) as EntityData[] ?? []) {
            this.addEntity(entityData, false);
        };
    }

    public addEntity(entityData: EntityData, addToMapProperties: boolean = true): boolean {
        if (this.entities.find(entity => entity.id === entityData.id)) {
            return false;
        }
        this.entities.push(entityData);
        this.nextEntityId = Math.max(this.nextEntityId, entityData.id);
        if (addToMapProperties) {
            return this.addEntityToMapProperties(entityData);
        }
        return true;
    }

    public getEntity(id: number): EntityData | undefined {
        return this.entities.find(entity => entity.id === id);
    }

    public deleteEntity(id: number): boolean {
        const index = this.entities.findIndex(entityData => entityData.id === id);
        if (index !== -1) {
            this.entities.splice(index, 1);
            return this.deleteEntityFromMapProperties(id);
        }
        return false;
    }

    public updateEntity(id: number, config: Partial<EntityData>): EntityData {
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
                value: JSON.parse(JSON.stringify([])),
            });
        }
        const entitiesPropertyValues = JSON.parse(JSON.stringify(this.getEntitiesMapProperty()?.value)) as EntityData[];

        if (entitiesPropertyValues.find(entity => entity.id === entityData.id)) {
            console.warn(`ADD ENTITY FAIL: ENTITY OF ID ${entityData.id} ALREADY EXISTS WITHIN THE GAMEMAP!`);
            return false;
        }
        entitiesPropertyValues.push(entityData);

        const entitiesMapProperty = this.getEntitiesMapProperty();
        if (entitiesMapProperty !== undefined) {
            entitiesMapProperty.value = JSON.parse(JSON.stringify(entitiesPropertyValues));
        }

        return true;
    }

    private deleteEntityFromMapProperties(id: number): boolean {
        const entitiesPropertyValues = JSON.parse(JSON.stringify(this.getEntitiesMapProperty()?.value)) as EntityData[];
        const indexToRemove = entitiesPropertyValues.findIndex(entityData => entityData.id === id);
        if (indexToRemove !== -1) {
            entitiesPropertyValues.splice(indexToRemove, 1);
            const entitiesMapProperty = this.getEntitiesMapProperty();
            if (entitiesMapProperty !== undefined) {
                entitiesMapProperty.value = JSON.parse(JSON.stringify(entitiesPropertyValues));
                return true;
            } else {
                return false;
            }
        }
        return false;
    }

    private updateEntityInMapProperties(entityData: EntityData): boolean {
        const entitiesPropertyValue = JSON.parse(JSON.stringify(this.getEntitiesMapProperty()?.value)) as EntityData[];

        const entityIndex = entitiesPropertyValue.findIndex(entity => entity.id === entityData.id);

        if (entityIndex === -1) {
            console.warn(`CANNOT FIND ENTITY WITH ID: ${entityData.id} IN MAP PROPERTIES!`);
            return false;
        }

        const entitiesMapProperty = this.getEntitiesMapProperty();
        if (entitiesMapProperty !== undefined) {
            entitiesPropertyValue[entityIndex] = entityData;
            entitiesMapProperty.value = JSON.parse(JSON.stringify(entitiesPropertyValue));
            return true;
        }
        return false;
    }

    private getEntitiesMapProperty(): ITiledMapProperty | undefined {
        return this.gameMap.getMapPropertyByKey(this.MAP_PROPERTY_ENTITIES_NAME);
    }

    public getEntities(): EntityData[] {
        return this.entities;
    }

    public getNextEntityId(): number {
        return this.nextEntityId + 1;
    }
}