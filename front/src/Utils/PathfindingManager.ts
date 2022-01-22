import * as EasyStar from "easystarjs";
import { MathUtils } from "./MathUtils";

export class PathfindingManager {
    private scene: Phaser.Scene;

    private easyStar;
    private grid: number[][];
    private tileDimensions: { width: number; height: number };

    constructor(scene: Phaser.Scene, collisionsGrid: number[][], tileDimensions: { width: number; height: number }) {
        this.scene = scene;

        this.easyStar = new EasyStar.js();
        this.easyStar.enableDiagonals();

        this.grid = collisionsGrid;
        this.tileDimensions = tileDimensions;
        this.setEasyStarGrid(collisionsGrid);
    }

    public async findPath(
        start: { x: number; y: number },
        end: { x: number; y: number },
        measuredInPixels: boolean = true,
        tryFindingNearestAvailable: boolean = false
    ): Promise<{ x: number; y: number }[]> {
        let endPoints: { x: number; y: number }[] = [end];
        if (tryFindingNearestAvailable) {
            endPoints = [
                end,
                ...this.getNeighbouringTiles(end).sort((a, b) => {
                    const aDist = MathUtils.distanceBetween(a, start, false);
                    const bDist = MathUtils.distanceBetween(b, start, false);
                    if (aDist > bDist) {
                        return 1;
                    }
                    if (aDist < bDist) {
                        return -1;
                    }
                    return 0;
                }),
            ];
        }
        let path: { x: number; y: number }[] = [];
        while (endPoints.length > 0) {
            const endPoint = endPoints.shift();
            if (!endPoint) {
                return [];
            }
            // rejected Promise will return undefined for path
            path = await this.getPath(start, endPoint).catch();
            if (path && path.length > 0) {
                return measuredInPixels ? this.mapTileUnitsToPixels(path) : path;
            }
        }
        return [];
    }

    private mapTileUnitsToPixels(path: { x: number; y: number }[]): { x: number; y: number }[] {
        return path.map((step) => {
            return {
                x: step.x * this.tileDimensions.width + this.tileDimensions.width * 0.5,
                y: step.y * this.tileDimensions.height + this.tileDimensions.height * 0.5,
            };
        });
    }

    private getNeighbouringTiles(tile: { x: number; y: number }): { x: number; y: number }[] {
        const xOffsets = [-1, 0, 1, 1, 1, 0, -1, -1];
        const yOffsets = [-1, -1, -1, 0, 1, 1, 1, 0];

        const neighbours: { x: number; y: number }[] = [];
        for (let i = 0; i < 8; i += 1) {
            const tileToCheck = { x: tile.x + xOffsets[i], y: tile.y + yOffsets[i] };
            if (this.isTileWithinMap(tileToCheck)) {
                neighbours.push(tileToCheck);
            }
        }
        return neighbours;
    }

    private isTileWithinMap(tile: { x: number; y: number }): boolean {
        const mapHeight = this.grid.length ?? 0;
        const mapWidth = this.grid[0]?.length ?? 0;

        return MathUtils.isBetween(tile.x, 0, mapWidth) && MathUtils.isBetween(tile.y, 0, mapHeight);
    }

    /**
     * Returns empty array if path was not found
     */
    private async getPath(
        start: { x: number; y: number },
        end: { x: number; y: number }
    ): Promise<{ x: number; y: number }[]> {
        return new Promise((resolve, reject) => {
            this.easyStar.findPath(start.x, start.y, end.x, end.y, (path) => {
                if (path === null) {
                    resolve([]);
                } else {
                    resolve(path);
                }
            });
            this.easyStar.calculate();
        });
    }

    private setEasyStarGrid(grid: number[][]): void {
        this.easyStar.setGrid(grid);
        this.easyStar.setAcceptableTiles([0]); // zeroes are walkable
    }

    private logGridToTheConsole(grid: number[][]): void {
        let rowNumber = 0;
        for (const row of grid) {
            console.log(`${rowNumber}:\t${row}`);
            rowNumber += 1;
        }
    }
}
