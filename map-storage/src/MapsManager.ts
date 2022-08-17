import { GameMap } from "@workadventure/map-editor-types";
import { readFile } from "fs/promises";

export class MapsManager {
    private loadedMaps: Map<string, GameMap>;

    constructor() {
        this.loadedMaps = new Map<string, GameMap>();
    }

    public async getMap(path: string): Promise<any> {
        // const inMemoryGameMap = this.loadedMaps.get(path);
        // if (inMemoryGameMap) {
        //     console.log("SERVE MAP FROM MEMORY");
        //     console.log(inMemoryGameMap);
        //     // return inMemoryGameMap.getMap();
        // }
        console.log("SERVE MAP FROM FILE");
        const file = await readFile(`./public${path}`, "utf-8");
        const map = JSON.parse(file);
        const gameMap = new GameMap(map);
        this.loadedMaps.set(path, map);
        return map;
    }
}
