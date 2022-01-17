import * as EasyStar from "easystarjs";

export class PathfindingManager {
    private scene: Phaser.Scene;

    private easyStar;

    constructor(scene: Phaser.Scene, collisionsGrid: number[][]) {
        this.scene = scene;

        this.easyStar = new EasyStar.js();
        this.easyStar.disableDiagonals();

        this.setGrid(collisionsGrid);
    }

    public async findPath(
        start: { x: number; y: number },
        end: { x: number; y: number }
    ): Promise<{ x: number; y: number }[]> {
        return new Promise((resolve, reject) => {
            this.easyStar.findPath(start.x, start.y, end.x, end.y, (path) => {
                if (path === null) {
                    reject("Path was not found");
                } else {
                    resolve(path);
                }
            });
            this.easyStar.calculate();
        });
    }

    private setGrid(grid: number[][]): void {
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
