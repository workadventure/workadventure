import {
    Command,
    CommandConfig,
    GameMap,
    UpdateAreaCommand,
    DeleteAreaCommand,
    UpdateEntityCommand,
    CreateAreaCommand,
    CreateEntityCommand,
    DeleteEntityCommand,
    EntityCollection,
    EntityPrefab,
    EntityRawPrefab,
} from "@workadventure/map-editor";
import { EditMapCommandMessage } from "@workadventure/messages";
import { writeFileSync } from "fs";
import { readFile } from "fs/promises";

// TODO: dynamic imports?
import furnitureCollection from "./entities/collections/FurnitureCollection.json";
import officeCollection from "./entities/collections/OfficeCollection.json";

class MapsManager {
    private loadedMaps: Map<string, GameMap>;
    private loadedMapsCommandsQueue: Map<string, EditMapCommandMessage[]>;
    private loadedCollections: Map<string, EntityCollection>;

    private saveMapIntervals: Map<string, NodeJS.Timer>;
    private mapLastChangeTimestamp: Map<string, number>;

    /**
     * Attempt to save the map from memory to file every time interval
     */
    private readonly AUTO_SAVE_INTERVAL_MS: number = 15 * 1000; // 15 seconds
    /**
     * Time after which the command will be removed from the commands queue
     */
    private readonly COMMAND_TIME_IN_QUEUE_MS: number = this.AUTO_SAVE_INTERVAL_MS * 2;
    /**
     * Kill saving map interval after given time of no changes done to the map
     */
    private readonly NO_CHANGE_DETECTED_MS: number = 1 * 60 * 1000; // 1 minute

    constructor() {
        this.loadedMaps = new Map<string, GameMap>();
        this.loadedMapsCommandsQueue = new Map<string, EditMapCommandMessage[]>();
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

    public executeCommand(mapKey: string, commandConfig: CommandConfig, commandId?: string): boolean {
        const gameMap = this.getGameMap(mapKey);
        if (!gameMap) {
            return false;
        }
        this.mapLastChangeTimestamp.set(mapKey, +new Date());
        if (!this.saveMapIntervals.has(mapKey)) {
            this.startSavingMapInterval(mapKey, this.AUTO_SAVE_INTERVAL_MS);
        }
        let command: Command | undefined;
        try {
            switch (commandConfig.type) {
                case "UpdateAreaCommand": {
                    command = new UpdateAreaCommand(gameMap, commandConfig, commandId);
                    command.execute();
                    break;
                }
                case "CreateAreaCommand": {
                    command = new CreateAreaCommand(gameMap, commandConfig, commandId);
                    command.execute();
                    break;
                }
                case "DeleteAreaCommand": {
                    command = new DeleteAreaCommand(gameMap, commandConfig, commandId);
                    command.execute();
                    break;
                }
                case "UpdateEntityCommand": {
                    command = new UpdateEntityCommand(gameMap, commandConfig, commandId);
                    command.execute();
                    break;
                }
                case "CreateEntityCommand": {
                    command = new CreateEntityCommand(gameMap, commandConfig, commandId);
                    command.execute();
                    break;
                }
                case "DeleteEntityCommand": {
                    command = new DeleteEntityCommand(gameMap, commandConfig, commandId);
                    command.execute();
                    break;
                }
                default: {
                    const _exhaustiveCheck: never = commandConfig;
                    break;
                }
            }
        } catch (e) {
            console.log(e);
            return false;
        }
        return true;
    }

    public getCommandsNewerThan(mapKey: string, commandId: string): EditMapCommandMessage[] {
        const queue = this.loadedMapsCommandsQueue.get(mapKey);
        if (queue) {
            const commandIndex = queue.findIndex((command) => command.id === commandId);
            if (commandIndex === -1) {
                return [];
            }
            return queue.slice(commandIndex + 1);
        }
        return [];
    }

    public getGameMap(key: string): GameMap | undefined {
        return this.loadedMaps.get(key);
    }

    public async getMap(path: string): Promise<any> {
        const inMemoryGameMap = this.loadedMaps.get(path);
        if (inMemoryGameMap) {
            return inMemoryGameMap.getMap();
        }
        try {
            const file = await readFile(`./public${path}`, "utf-8");
            const map = JSON.parse(file);
            this.loadedMaps.set(path, new GameMap(map));
            return map;
        } catch (error) {
            return error;
        }
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

    public addCommandToQueue(mapKey: string, message: EditMapCommandMessage): void {
        if (!this.loadedMapsCommandsQueue.has(mapKey)) {
            this.loadedMapsCommandsQueue.set(mapKey, []);
        }
        const queue = this.loadedMapsCommandsQueue.get(mapKey);
        if (queue !== undefined) {
            queue.push(message);
            this.setCommandDeletionTimeout(mapKey, message.id);
        }
        this.loadedMaps.get(mapKey)?.updateLastCommandIdProperty(message.id);
    }

    private setCommandDeletionTimeout(mapKey: string, commandId: string): void {
        setTimeout(() => {
            const queue = this.loadedMapsCommandsQueue.get(mapKey);
            if (!queue) {
                return;
            }
            const index = queue.findIndex((command) => command.id === commandId);
            if (index === -1) {
                return;
            }
            queue.splice(index, 1);
        }, this.COMMAND_TIME_IN_QUEUE_MS);
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
