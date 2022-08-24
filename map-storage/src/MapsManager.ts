import { GameMap } from "@workadventure/map-editor-types";
import { readFile } from "fs/promises";

export class MapsManager {
    private loadedMaps: Map<string, GameMap>;

    constructor() {
        this.loadedMaps = new Map<string, GameMap>();
    }

    public async getMap(path: string): Promise<any> {
        const inMemoryGameMap = this.loadedMaps.get(path);
        if (inMemoryGameMap) {
            console.log("SERVE MAP FROM MEMORY");
            return inMemoryGameMap.getMap();
        }
        console.log("SERVE MAP FROM FILE");
        const file = await readFile(`./public${path}`, "utf-8");
        const map = JSON.parse(file);
        this.loadedMaps.set(path, new GameMap(map));
        return map;
    }
}
