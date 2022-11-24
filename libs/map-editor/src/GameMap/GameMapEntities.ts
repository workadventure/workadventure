import { Direction, EntityData } from '../types';
import type { GameMap } from './GameMap';

export class GameMapEntities {

    private gameMap: GameMap;

    private entities: EntityData[] = [];

    private nextEntityId: number = 0;

    constructor(gameMap: GameMap) {
        this.gameMap = gameMap;

        // TODO: Get entities from the map file
        for (const entityData of this.loadMockEntities()) {
            this.addEntity(entityData);
        };
    }

    public addEntity(entityData: EntityData): void {
        this.entities.push(entityData);
        this.nextEntityId = Math.max(this.nextEntityId, entityData.id);
        console.log(this.nextEntityId);
    }

    public removEntity(id: number): void {
        const index = this.entities.findIndex(entityData => entityData.id === id);
        if (index !== -1) {
            this.entities.splice(index, 1);
        }
    }

    private loadMockEntities(): EntityData[] {
        return [
            {
                id: 0,
                x: 320,
                y: 304,
                interactive: true,
                properties: {
                    jitsiRoom: "ChillZone",
                    playAudio: "../assets/audio/campfire.ogg",
                    openTab: "https://img-9gag-fun.9cache.com/photo/ay2DNzM_460svav1.mp4",
                },
                prefab:{
                    name:"table",
                    tags:["table"],
                    imagePath : "table",
                    collisionGrid: [
                        [0, 0],
                        [1, 1],
                        [1, 1],
                    ],
                    direction:Direction.Down,
                    color: "saddlebrown",
                }
            }
        ];
    }

    public getEntities(): EntityData[] {
        return this.entities;
    }

    public getNextEntityId(): number {
        return this.nextEntityId + 1;
    }
}