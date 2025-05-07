import { MathUtils } from "@workadventure/math-utils";
import * as EasyStar from "easystarjs";
import { CHARACTER_BODY_HEIGHT, CHARACTER_BODY_OFFSET_X, CHARACTER_BODY_OFFSET_Y } from "../Phaser/Entity/Character";

export enum PathTileType {
    Walkable = 0,
    Collider = 1,
    Exit = 2,
    Start = 3,
}

export class PathfindingManager {
    private easyStar: EasyStar.js;
    private grid: number[][];
    private tileDimensions: { width: number; height: number };

    constructor(collisionsGrid: number[][], tileDimensions: { width: number; height: number }) {
        this.easyStar = new EasyStar.js();
        this.easyStar.enableDiagonals();
        this.easyStar.disableCornerCutting();
        this.easyStar.setTileCost(PathTileType.Exit, 100);
        this.easyStar.setIterationsPerCalculation(1000);

        this.grid = collisionsGrid;
        this.tileDimensions = tileDimensions;
        this.setEasyStarGrid(collisionsGrid);
        //this.logGridToTheConsole(collisionsGrid);
    }

    public setCollisionGrid(collisionGrid: number[][]): void {
        this.setEasyStarGrid(collisionGrid);
    }

    public async findPathFromGameCoordinates(
        start: { x: number; y: number },
        end: { x: number; y: number },
        tryFindingNearestAvailable = false
    ): Promise<{ x: number; y: number }[]> {
        const startTile = this.mapPixelsToTileUnits(this.clampToMap(start));
        const endTile = this.mapPixelsToTileUnits(this.clampToMap(end));
        const result = await this.findPath(startTile, endTile, tryFindingNearestAvailable);
        const path = result.path;
        if (path.length > 1) {
            // Replace the first element of the path with the actual start position
            path[0] = { x: start.x, y: start.y + this.tileDimensions.height * 0.5 }; // We need to add half of the tile height to get the bottom center of the tile as long as the player origin is centered
            if (result.isExactTarget) {
                // Let's put back the exact position.
                // Actually, we are not targeting always the absolutely exact pixel-perfect position.
                // Indeed, we want the hitbox of the sprite to be completely inside the tile.
                // Otherwise, the hitbox of the sprite could overflow a collide tile, so the player could use
                // his keyboard to move the sprite inside the wall.
                path[path.length - 1] = this.fitBodyWithinTile(
                    end.x,
                    end.y,
                    this.tileDimensions.width,
                    this.tileDimensions.height
                );
            }
        }
        return path;
    }

    private fitBodyWithinTile(x: number, y: number, tileWidth: number, tileHeight: number): { x: number; y: number } {
        const xMod = x % tileWidth;
        const yMod = y % tileHeight;

        if (yMod < CHARACTER_BODY_HEIGHT / 2 + CHARACTER_BODY_OFFSET_Y) {
            y -= yMod;
            y += CHARACTER_BODY_HEIGHT / 2 + CHARACTER_BODY_OFFSET_Y;
        }
        if (xMod < CHARACTER_BODY_HEIGHT / 2 + CHARACTER_BODY_OFFSET_X) {
            x -= xMod;
            x += CHARACTER_BODY_HEIGHT / 2 + CHARACTER_BODY_OFFSET_X;
        }
        if (yMod > tileHeight - CHARACTER_BODY_HEIGHT / 2 + CHARACTER_BODY_OFFSET_Y) {
            y -= yMod;
            y += tileHeight - CHARACTER_BODY_HEIGHT / 2 + CHARACTER_BODY_OFFSET_Y;
        }
        if (xMod > tileWidth - CHARACTER_BODY_HEIGHT / 2 + CHARACTER_BODY_OFFSET_X) {
            x -= xMod;
            x += tileWidth - CHARACTER_BODY_HEIGHT / 2 + CHARACTER_BODY_OFFSET_X;
        }

        return { x, y };
    }

    private async findPath(
        start: { x: number; y: number },
        end: { x: number; y: number },
        tryFindingNearestAvailable = false
    ): Promise<{ path: { x: number; y: number }[]; isExactTarget: boolean }> {
        let isExactTarget = true;
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
                return { path: [], isExactTarget: false };
            }
            // rejected Promise will return undefined for path
            // eslint-disable-next-line no-await-in-loop
            path = await this.getPath(start, endPoint).catch();
            if (path && path.length > 0) {
                return { path: this.mapTileUnitsToPixels(path), isExactTarget };
            }
            isExactTarget = false;
        }
        return { path: [], isExactTarget: false };
    }

    private mapTileUnitsToPixels(path: { x: number; y: number }[]): { x: number; y: number }[] {
        return path.map(this.mapTileUnitToPixels.bind(this));
    }

    public mapTileUnitToPixels(tilePosition: { x: number; y: number }): { x: number; y: number } {
        return {
            x: tilePosition.x * this.tileDimensions.width + this.tileDimensions.width * 0.5,
            y: tilePosition.y * this.tileDimensions.height + this.tileDimensions.height * 0.5,
        };
    }

    private mapPixelsToTileUnits(position: { x: number; y: number }): { x: number; y: number } {
        return {
            x: Math.floor(position.x / this.tileDimensions.width),
            y: Math.floor(position.y / this.tileDimensions.height),
        };
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
     * Takes a position in pixels and returns it.
     * It the position is out of the bounds of the map, takes the closest position within the map.
     */
    private clampToMap(position: { x: number; y: number }): { x: number; y: number } {
        let x = position.x;
        let y = position.y;
        const mapHeight = this.grid.length;
        const mapWidth = this.grid[0].length;

        if (x < 0) {
            x = 0;
        }
        if (y < 0) {
            y = 0;
        }
        if (x > mapWidth * this.tileDimensions.width) {
            x = mapWidth * this.tileDimensions.width - 1;
        }
        if (y > mapHeight * this.tileDimensions.height) {
            y = mapHeight * this.tileDimensions.height - 1;
        }

        return { x, y };
    }

    /**
     * Returns empty array if path was not found
     */
    private async getPath(
        start: { x: number; y: number },
        end: { x: number; y: number }
    ): Promise<{ x: number; y: number }[]> {
        return new Promise((resolve) => {
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
        this.easyStar.setAcceptableTiles([PathTileType.Walkable, PathTileType.Exit, PathTileType.Start]);
    }

    /*private logGridToTheConsole(grid: number[][]): void {
        let rowNumber = 0;
        for (const row of grid) {
            console.info(`${rowNumber}:\t${row}`);
            rowNumber += 1;
        }
    }*/
}
