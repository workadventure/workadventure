import {
    Command,
    CommandConfig,
    GameMap,
    UpdateAreaCommand,
    DeleteAreaCommand,
    CreateAreaCommand,
    CreateEntityCommand,
    DeleteEntityCommand,
    EntityCollection,
    EntityPrefab,
    EntityRawPrefab,
} from "@workadventure/map-editor";
import { writeFileSync } from "fs";
import { readFile } from "fs/promises";

// TODO: dynamic imports?
import furnitureCollection from "./entities/collections/FurnitureCollection.json";
import officeCollection from "./entities/collections/OfficeCollection.json";

class MapsManager {
    private loadedMaps: Map<string, GameMap>;
    private loadedCollections: Map<string, EntityCollection>;

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

        this.loadedCollections = new Map<string, EntityCollection>();

        for (const collection of [furnitureCollection, officeCollection]) {
            const parsedCollectionPrefabs: EntityPrefab[] = [];
            for (const rawPrefab of collection.collection) {
                parsedCollectionPrefabs.push(
                    this.parseRawEntityPrefab(collection.collectionName, rawPrefab as EntityRawPrefab)
                );
            }
            const parsedCollection: EntityCollection = structuredClone(collection);
            parsedCollection.collection = parsedCollectionPrefabs;
            this.loadedCollections.set(parsedCollection.collectionName, parsedCollection);
        }
    }

    public executeCommand(mapKey: string, commandConfig: CommandConfig): boolean {
        const gameMap = this.getGameMap(mapKey);
        if (!gameMap) {
            return false;
        }
        this.mapLastChangeTimestamp.set(mapKey, +new Date());
        if (!this.saveMapIntervals.has(mapKey)) {
            this.startSavingMapInterval(mapKey, this.AUTO_SAVE_INTERVAL_MS);
        }
        let command: Command;
        try {
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
                case "CreateEntityCommand": {
                    command = new CreateEntityCommand(gameMap, commandConfig);
                    command.execute();
                    break;
                }
                case "DeleteEntityCommand": {
                    command = new DeleteEntityCommand(gameMap, commandConfig);
                    command.execute();
                    break;
                }
                default: {
                    const _exhaustiveCheck: never = commandConfig;
                }
            }
        } catch (e) {
            console.log(e);
            return false;
        }
        return true;
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

    public getEntityCollection(collectionName: string): EntityCollection | undefined {
        return this.loadedCollections.get(collectionName);
    }

    public getEntityCollectionsNames(): string[] {
        const names: string[] = [];
        for (const collection of this.loadedCollections.values()) {
            names.push(collection.collectionName);
        }
        return names;
    }

    public getEntityPrefab(collectionName: string, entityId: string): EntityPrefab | undefined {
        return this.loadedCollections.get(collectionName)?.collection.find((entity) => entity.id === entityId);
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

    private parseRawEntityPrefab(collectionName: string, rawPrefab: EntityRawPrefab): EntityPrefab {
        return {
            ...rawPrefab,
            collectionName,
            id: `${rawPrefab.name}:${rawPrefab.color}:${rawPrefab.direction}`,
        };
    }
}

export const mapsManager = new MapsManager();
