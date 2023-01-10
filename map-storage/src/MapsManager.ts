import {
    Command,
    CommandConfig,
    GameMap,
    UpdateAreaCommand,
    DeleteAreaCommand,
    CreateAreaCommand,
} from "@workadventure/map-editor";
import { ITiledMap } from "@workadventure/tiled-map-type-guard";
import { fileSystem } from "./fileSystem";
import { mapPathUsingDomain } from "./Services/PathMapper";

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
            throw new Error('Could not find GameMap with key "' + mapKey + '"');
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
            case "CreateAreaCommand": {
                command = new CreateAreaCommand(gameMap, commandConfig);
                command.execute();
                break;
            }
            case "DeleteAreaCommand": {
                command = new DeleteAreaCommand(gameMap, commandConfig);
                command.execute();
                break;
            }
            default: {
                const _exhaustiveCheck: never = commandConfig;
            }
        }
    }

    public getGameMap(key: string): GameMap | undefined {
        return this.loadedMaps.get(key);
    }

    public async getMap(path: string, domain: string): Promise<ITiledMap> {
        const key = mapPathUsingDomain(path, domain);
        const inMemoryGameMap = this.loadedMaps.get(key);
        if (inMemoryGameMap) {
            return inMemoryGameMap.getMap();
        }
        const file = await fileSystem.readFileAsString(key);
        const map = ITiledMap.parse(JSON.parse(file));
        this.loadedMaps.set(key, new GameMap(map));
        return map;
    }

    private clearSaveMapInterval(key: string): boolean {
        const interval = this.saveMapIntervals.get(key);
        if (interval) {
            clearInterval(interval);
            this.saveMapIntervals.delete(key);
            this.mapLastChangeTimestamp.delete(key);
            return true;
        }
        return false;
    }

    private startSavingMapInterval(key: string, intervalMS: number): void {
        this.saveMapIntervals.set(
            key,
            setInterval(() => {
                (async () => {
                    console.log(`saving map ${key}`);
                    const gameMap = this.loadedMaps.get(key);
                    if (gameMap) {
                        await fileSystem.writeStringAsFile(key, JSON.stringify(gameMap.getMap()));
                    }
                    const lastChangeTimestamp = this.mapLastChangeTimestamp.get(key);
                    if (lastChangeTimestamp === undefined) {
                        return;
                    }
                    if (lastChangeTimestamp + this.NO_CHANGE_DETECTED_MS < +new Date()) {
                        console.log(`NO CHANGES ON THE MAP ${key} DETECTED. STOP AUTOSAVING`);
                        this.clearSaveMapInterval(key);
                    }
                })().catch((e) => console.error(e));
            }, intervalMS)
        );
    }
}

export const mapsManager = new MapsManager();
