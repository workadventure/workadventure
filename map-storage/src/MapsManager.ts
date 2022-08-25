import { Command, CommandConfig, GameMap, UpdateAreaCommand } from "@workadventure/map-editor";
import { readFile } from "fs/promises";

class MapsManager {
    private loadedMaps: Map<string, GameMap>;

    constructor() {
        this.loadedMaps = new Map<string, GameMap>();
    }

    public executeCommand(mapKey: string, commandConfig: CommandConfig): void {
        const gameMap = this.getGameMap(mapKey);
        if (!gameMap) {
            return;
        }
        let command: Command;
        switch (commandConfig.type) {
            case "UpdateAreaCommand": {
                command = new UpdateAreaCommand(gameMap, commandConfig);
                command.execute();
                break;
            }
            default: {
                const _exhaustiveCheck: never = commandConfig.type;
                return;
            }
        }
    }

    public getGameMap(key: string): GameMap | undefined {
        return this.loadedMaps.get(key);
    }

    public async getMap(path: string): Promise<any> {
        const inMemoryGameMap = this.loadedMaps.get(path);
        if (inMemoryGameMap) {
            return inMemoryGameMap.getMap();
        }
        const file = await readFile(`./public${path}`, "utf-8");
        const map = JSON.parse(file);
        this.loadedMaps.set(path, new GameMap(map));
        return map;
    }
}

export const mapsManager = new MapsManager();
