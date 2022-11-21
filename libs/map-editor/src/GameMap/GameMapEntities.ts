import type { EntityData } from '../types';
import type { GameMap } from './GameMap';

export class GameMapEntities {

    private gameMap: GameMap;

    private entities: EntityData[] = [];

    constructor(gameMap: GameMap) {
        this.gameMap = gameMap;

        // TODO: Get entities from the map file
        this.entities = this.loadMockEntities();
    }

    private loadMockEntities(): EntityData[] {
        return [
            {
                id: 0,
                image: "table",
                x: 320,
                y: 336,
                collisionGrid: [
                    [0, 0],
                    [1, 1],
                    [1, 1],
                ],
                interactive: true,
                properties: {
                    openWebsite: "https://wikipedia.org",
                },
            }
        ];
    }

    public getEntities(): EntityData[] {
        return this.entities;
    }
}