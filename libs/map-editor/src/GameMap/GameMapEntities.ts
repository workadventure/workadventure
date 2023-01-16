import { ITiledMapProperty, Json } from "@workadventure/tiled-map-type-guard";
import _ from "lodash";
import { EntityData } from "../types";
import type { GameMap } from "./GameMap";

export class GameMapEntities {
    private gameMap: GameMap;

    private entities: Map<number, EntityData> = new Map<number, EntityData>();

    private nextEntityId = 0;

    private readonly MAP_PROPERTY_ENTITIES_NAME: string = "entities";

    constructor(gameMap: GameMap) {
        this.gameMap = gameMap;

        const entitiesData: unknown = structuredClone(this.getEntitiesMapProperty()?.value ?? []);

        for (const entityData of (entitiesData as EntityData[]) ?? []) {
            this.addEntity(entityData);
        }
    }

    public addEntity(entityData: EntityData): boolean {
        if (this.entities.has(entityData.id)) {
            return false;
        }
        this.entities.set(entityData.id, entityData);
        this.nextEntityId = Math.max(this.nextEntityId, entityData.id);
        return true;
    }

    public getEntity(id: number): EntityData | undefined {
        return this.entities.get(id);
    }

    public deleteEntity(id: number): boolean {
        return this.entities.delete(id);
    }

    public updateEntity(id: number, config: Partial<EntityData>): EntityData {
        const entity = this.getEntity(id);
        if (!entity) {
            throw new Error(`Entity of id: ${id} does not exists!`);
        }
        _.merge(entity, config);
        return entity;
    }

    public updateEntitiesMapProperty(): void {
        if (!this.getEntitiesMapProperty()) {
            this.gameMap.getMap().properties?.push({
                name: this.MAP_PROPERTY_ENTITIES_NAME,
                type: "class",
                value: JSON.parse(JSON.stringify([])) as Json,
            });
        }
        const entitiesMapProperty = this.getEntitiesMapProperty();

        if (entitiesMapProperty) {
            entitiesMapProperty.value = Array.from(this.entities.values()) as unknown as Json;
        }
    }

    private getEntitiesMapProperty(): ITiledMapProperty | undefined {
        return this.gameMap.getMapPropertyByKey(this.MAP_PROPERTY_ENTITIES_NAME);
    }

    public getEntities(): EntityData[] {
        return Array.from(this.entities.values());
    }

    public getNextEntityId(): number {
        return this.nextEntityId + 1;
    }
}
