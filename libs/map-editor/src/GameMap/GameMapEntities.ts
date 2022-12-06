import { ITiledMapProperty } from '@workadventure/tiled-map-type-guard';
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
            this.addEntity(entityData);
        };
    }

    public addEntity(entityData: EntityData): boolean {
        if (this.entities.find(entity => entity.id === entityData.id)) {
            return false;
        }
        this.entities.push(entityData);
        this.nextEntityId = Math.max(this.nextEntityId, entityData.id);
        this.addEntityToMapProperties(entityData);

        return true;
    }

    public getEntity(id: number): EntityData | undefined {
        return this.entities.find(entity => entity.id === id);
    }

    public deleteEntity(id: number): boolean {
        const index = this.entities.findIndex(entityData => entityData.id === id);
        if (index !== -1) {
            this.entities.splice(index, 1);
            return true;
        }
        return false;
    }

    private addEntityToMapProperties(entityData: EntityData): void {
        if (this.gameMap.getMap().properties === undefined) {
            this.gameMap.getMap().properties = [];
        }
        if (!this.getEntitiesMapProperty()) {
            this.gameMap.getMap().properties?.push({
                name: this.MAP_PROPERTY_ENTITIES_NAME,
                type: "string",
                propertytype: "string",
                value: JSON.parse(JSON.stringify([])),
            });
        }
        const entitiesPropertyValues = JSON.parse(JSON.stringify(this.getEntitiesMapProperty()?.value)) as EntityData[];

        entitiesPropertyValues.push(entityData);

        const entitiesMapProperty = this.getEntitiesMapProperty();
        if (entitiesMapProperty !== undefined) {
            entitiesMapProperty.value = JSON.parse(JSON.stringify(entitiesPropertyValues));
        }
    }

    private getEntitiesMapProperty(): ITiledMapProperty | undefined {
        return this.gameMap.getMap().properties?.find(property => property.name === this.MAP_PROPERTY_ENTITIES_NAME);
    }

    // private loadMockEntities(): EntityData[] {
    //     return [
    //         {
    //             id: 0,
    //             x: 320,
    //             y: 304,
    //             interactive: true,
    //             properties: {
    //                 jitsiRoom: {roomName : "ChillZone", buttonLabel :"Open Jitsi"},
    //                 playAudio: {audioLink : "../assets/audio/campfire.ogg", buttonLabel:"Play campfire sound"},
    //                 openTab: {link:"https://img-9gag-fun.9cache.com/photo/ay2DNzM_460svav1.mp4", buttonLabel:"Show me some kitties!"},
    //             },
    //             prefab:{
    //                 name:"table",
    //                 tags:["table"],
    //                 imagePath : "table",
    //                 collisionGrid: [
    //                     [0, 0],
    //                     [1, 1],
    //                     [1, 1],
    //                 ],
    //                 direction: Direction.Down,
    //                 color: "saddlebrown",
    //             }
    //         }
    //     ];
    // }

    public getEntities(): EntityData[] {
        return this.entities;
    }

    public getNextEntityId(): number {
        return this.nextEntityId + 1;
    }
}