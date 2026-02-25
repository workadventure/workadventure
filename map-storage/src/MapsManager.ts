import type { Command } from "@workadventure/map-editor";
import { WamFile, WAMFileFormat } from "@workadventure/map-editor";
import type { EditMapCommandMessage } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import { fileSystem } from "./fileSystem";
import { MapListService } from "./Services/MapListService";
import { WebHookService } from "./Services/WebHookService";
import { WEB_HOOK_URL } from "./Enum/EnvironmentVariable";
class MapsManager {
    private loadedMaps: Map<string, WamFile>;
    private loadedMapsCommandsQueue: Map<string, EditMapCommandMessage[]>;

    private saveMapIntervals: Map<string, NodeJS.Timeout>;
    private mapLastChangeTimestamp: Map<string, number>;

    private mapListService: MapListService;

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
    private readonly NO_CHANGE_DETECTED_MS: number = 1 * 20 * 1000; // 20 seconds

    constructor() {
        this.loadedMaps = new Map<string, WamFile>();
        this.loadedMapsCommandsQueue = new Map<string, EditMapCommandMessage[]>();
        this.saveMapIntervals = new Map<string, NodeJS.Timeout>();
        this.mapLastChangeTimestamp = new Map<string, number>();
        this.mapListService = new MapListService(fileSystem, new WebHookService(WEB_HOOK_URL));
    }

    public async executeCommand(mapKey: string, domain: string, command: Command): Promise<void> {
        const wamFile = this.getWamFile(mapKey);
        if (!wamFile) {
            throw new Error('Could not find WAM file with key "' + mapKey + '"');
        }
        this.mapLastChangeTimestamp.set(mapKey, +new Date());
        if (!this.saveMapIntervals.has(mapKey)) {
            this.startSavingMapInterval(mapKey, this.AUTO_SAVE_INTERVAL_MS);
        }
        const updatedWamFile = await command.execute();

        // Security check: Check that the map is valid after the change (it should be, but better safe than sorry)
        WAMFileFormat.parse(wamFile.getWam());

        if (updatedWamFile != undefined) {
            this.mapListService
                .updateWAMFileInCache(domain, mapKey.replace(domain, ""), updatedWamFile)
                .catch((e) => console.error(e));
        }
    }

    public getCommandsNewerThan(mapKey: string, commandId: string | undefined): EditMapCommandMessage[] {
        // shouldn't we just apply every command on this list to the new client?
        const queue = this.loadedMapsCommandsQueue.get(mapKey);
        if (queue) {
            if (commandId === undefined) {
                return queue;
            }
            const commandIndex = queue.findIndex((command) => command.id === commandId);
            if (commandIndex === -1) {
                // Most of the time, the last command id of the map will not be part of the queue
                // This is always true unless the last change was done less that 30 seconds ago.
                // In this case, let's apply the whole queue.
                return queue;
            }
            return queue.slice(commandIndex + 1);
        }
        return [];
    }

    public async getOrLoadWamFile(key: string): Promise<WamFile> {
        let wamFile = this.getWamFile(key);
        if (!wamFile) {
            wamFile = await this.loadWAMToMemory(key);
        }
        return wamFile;
    }

    public getWamFile(key: string): WamFile | undefined {
        return this.loadedMaps.get(key);
    }

    public getLoadedMaps(): string[] {
        return Array.from(this.loadedMaps.keys());
    }

    public async loadWAMToMemory(key: string): Promise<WamFile> {
        const file = await fileSystem.readFileAsString(key);
        const wam = WAMFileFormat.parse(JSON.parse(file));

        const wamFile = new WamFile(wam);
        this.loadedMaps.set(key, wamFile);

        return wamFile;
    }

    public clearAfterUpload(key: string): void {
        console.info(`[${new Date().toISOString()}] UPLOAD/DELETE DETECTED. CLEAR CACHE FOR: ${key}`);
        this.loadedMaps.delete(key);
        this.loadedMapsCommandsQueue.delete(key);
        this.clearSaveMapInterval(key);
    }

    public addCommandToQueue(mapKey: string, message: EditMapCommandMessage): void {
        let queue = this.loadedMapsCommandsQueue.get(mapKey);
        if (queue === undefined) {
            queue = [];
            this.loadedMapsCommandsQueue.set(mapKey, queue);
        }
        queue.push(message);
        this.setCommandDeletionTimeout(mapKey, message.id);
        this.loadedMaps.get(mapKey)?.updateLastCommandIdProperty(message.id);
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

    private setCommandDeletionTimeout(mapKey: string, commandId: string): void {
        setTimeout(() => {
            const queue = this.loadedMapsCommandsQueue.get(mapKey);
            if (!queue || queue.length === 0) {
                return;
            }
            if (queue[0].id === commandId) {
                queue.splice(0, 1);
            } else {
                console.error(
                    `[${new Date().toISOString()}] Command with id ${commandId} that is scheduled from removal in the queue is not the first command. This should never happen (unless the queue was purged and recreated within 30 seconds... unlikely.`
                );
            }
        }, this.COMMAND_TIME_IN_QUEUE_MS);
    }

    private startSavingMapInterval(key: string, intervalMS: number): void {
        this.saveMapIntervals.set(
            key,
            setInterval(() => {
                (async () => {
                    console.info(`[${new Date().toISOString()}] saving map ${key}`);
                    const wamFile = this.loadedMaps.get(key);
                    if (wamFile) {
                        await fileSystem.writeStringAsFile(key, JSON.stringify(wamFile.getWam()));
                    }
                    const lastChangeTimestamp = this.mapLastChangeTimestamp.get(key);
                    if (lastChangeTimestamp === undefined) {
                        return;
                    }
                    if (lastChangeTimestamp + this.NO_CHANGE_DETECTED_MS < +new Date()) {
                        console.info(
                            `[${new Date().toISOString()}] NO CHANGES ON THE MAP ${key} DETECTED. STOP AUTOSAVING`
                        );
                        this.clearSaveMapInterval(key);
                    }
                })().catch((e) => {
                    console.error(`[${new Date().toISOString()}]`, e, "STOP AUTOSAVING");
                    this.clearSaveMapInterval(key);
                    Sentry.captureException(e);
                });
            }, intervalMS)
        );
    }
}

export const mapsManager = new MapsManager();
