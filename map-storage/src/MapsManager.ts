import { Command, CommandConfig, GameMap, UpdateAreaCommand, DeleteAreaCommand } from "@workadventure/map-editor";
import { writeFileSync } from "fs";
import { readFile } from "fs/promises";

class MapsManager {
    private loadedMaps: Map<string, GameMap>;

    private saveMapIntervals: Map<string, NodeJS.Timer>;
    private mapLastChangeTimestamp: Map<string, number>;

    /**
     * Attempt to save the map from memory to file every time interval
     */
    private readonly AUTO_SAVE_INTERVAL_MS: number = 15 * 1000; // 15 seconds
    /**
     * Kill saving map interval after given time of no changes done to the map
     */
    private readonly NO_CHANGE_DETECTED_MS: number = 1 * 60 * 1000; // 1 minute

    constructor() {
        this.loadedMaps = new Map<string, GameMap>();
        this.saveMapIntervals = new Map<string, NodeJS.Timer>();
        this.mapLastChangeTimestamp = new Map<string, number>();
    }

    public executeCommand(mapKey: string, commandConfig: CommandConfig): void {
        const gameMap = this.getGameMap(mapKey);
        if (!gameMap) {
            return;
        }
        this.mapLastChangeTimestamp.set(mapKey, +new Date());
        if (!this.saveMapIntervals.has(mapKey)) {
            this.startSavingMapInterval(mapKey, this.AUTO_SAVE_INTERVAL_MS);
        }
        let command: Command;
        switch (commandConfig.type) {
            case "UpdateAreaCommand": {
                command = new UpdateAreaCommand(gameMap, commandConfig);
                command.execute();
                break;
            }
            case "DeleteAreaCommand": {
                try {
                    command = new DeleteAreaCommand(gameMap, commandConfig);
                    command.execute();
                } catch (e: unknown) {
                    console.log(e);
                    throw new Error("COULD NOT EXECUTE MAP-EDIT COMMAND");
                }
                break;
            }
            default: {
                const _exhaustiveCheck: never = commandConfig;
                return;
            }
        }
    }

    public clearSaveMapInterval(key: string): boolean {
        const interval = this.saveMapIntervals.get(key);
        if (interval) {
            clearInterval(interval);
            this.saveMapIntervals.delete(key);
            this.mapLastChangeTimestamp.delete(key);
            return true;
        }
        return false;
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

    private startSavingMapInterval(key: string, intervalMS: number): void {
        this.saveMapIntervals.set(
            key,
            setInterval(() => {
                console.log(`saving map ${key}`);
                const gameMap = this.loadedMaps.get(key);
                if (gameMap) {
                    writeFileSync(`./public${key}`, JSON.stringify(gameMap.getMap()));
                }
                const lastChangeTimestamp = this.mapLastChangeTimestamp.get(key);
                if (lastChangeTimestamp === undefined) {
                    return;
                }
                if (lastChangeTimestamp + this.NO_CHANGE_DETECTED_MS < +new Date()) {
                    console.log(`NO CHANGES ON THE MAP ${key} DETECTED. STOP AUTOSAVING`);
                    this.clearSaveMapInterval(key);
                }
            }, intervalMS)
        );
    }
}

export const mapsManager = new MapsManager();
