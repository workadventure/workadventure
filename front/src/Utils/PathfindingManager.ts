import * as EasyStar from "easystarjs";

export class PathfindingManager {
    private scene: Phaser.Scene;

    private easyStar;

    constructor(scene: Phaser.Scene, collisionsGrid: number[][]) {
        this.scene = scene;

        this.easyStar = new EasyStar.js();

        this.setGrid(collisionsGrid);
    }

    public findPath(start: { x: number; y: number }, end: { x: number; y: number }): void {
        console.log("TRY TO FIND PATH");
        this.easyStar.findPath(start.x, start.y, end.x, end.y, (path) => {
            if (path === null) {
                console.warn("Path was not found.");
            } else {
                console.log("path was found");
                console.log(path);
            }
        });
        this.easyStar.calculate();
    }

    private setGrid(grid: number[][]): void {
        console.log(grid);
        this.easyStar.setGrid(grid);
        this.easyStar.setAcceptableTiles([0]); // zeroes are walkable
        this.logGridToTheConsole(grid);
    }

    private logGridToTheConsole(grid: number[][]): void {
        let rowNumber = 0;
        for (const row of grid) {
            console.log(`${rowNumber}:\t${row}`);
            rowNumber += 1;
        }
    }
}
