import type { WAMSettings } from "@workadventure/map-editor";
import {
    migrateWorldSettingsFromWams,
    WAMFileFormat,
    WORLD_SETTINGS_FILE_NAME,
    WorldSettings,
} from "@workadventure/map-editor";
import { wamFileMigration } from "@workadventure/map-editor/src/Migrations/WamFileMigration";
import pLimit from "p-limit";
import type { LimitFunction } from "p-limit";
import type { FileSystemInterface } from "../Upload/FileSystemInterface";
import { FileNotFoundError } from "../Upload/FileNotFoundError";
import { MAX_SIMULTANEOUS_FS_READS } from "../Enum/EnvironmentVariable";
import { fileSystem } from "../fileSystem";
import { mapPathUsingDomain } from "./PathMapper";

/**
 * The settings shared by every map of a world, stored once per domain next to the WAM files.
 * The file does not exist until it is first read: it is then built from the WAM files.
 */
export class WorldSettingsService {
    // One migration-or-write at a time per domain, so a migration and a save cannot interleave.
    // ponytail: in-process lock, two map-storage replicas could still race on the very first migration.
    private readonly limiters = new Map<string, LimitFunction>();
    private static readonly readLimit = pLimit(MAX_SIMULTANEOUS_FS_READS);

    constructor(private readonly fileSystem: FileSystemInterface) {}

    public async read(domain: string): Promise<WorldSettings> {
        // Reads skip the lock: only building the file for the first time must not run twice.
        const stored = await this.readStored(domain);
        if (stored) {
            return stored;
        }
        return this.limit(domain, async () => {
            const storedMeanwhile = await this.readStored(domain);
            if (storedMeanwhile) {
                return storedMeanwhile;
            }
            const settings = await this.migrate(domain);
            await this.fileSystem.writeStringAsFile(this.path(domain), JSON.stringify(settings, null, 2));
            return settings;
        });
    }

    /**
     * The stored settings, or undefined when there are none yet. A file that cannot be parsed (hand-edited,
     * or written by another version) is not overwritten here: the settings are rebuilt from the WAM files
     * for this read, with a warning, and the next save from the editor replaces the file.
     */
    private async readStored(domain: string): Promise<WorldSettings | undefined> {
        let content: string;
        try {
            content = await this.fileSystem.readFileAsString(this.path(domain));
        } catch (e) {
            if (e instanceof FileNotFoundError) {
                return undefined;
            }
            throw e;
        }
        try {
            return WorldSettings.parse(JSON.parse(content));
        } catch (e) {
            console.error(`[${new Date().toISOString()}] Invalid world settings for "${domain}"`, e);
            const settings = await this.migrate(domain);
            return {
                ...settings,
                migrationWarnings: [
                    "The stored world settings could not be read; they were rebuilt from the maps. Save them to keep them.",
                    ...(settings.migrationWarnings ?? []),
                ],
            };
        }
    }

    private async migrate(domain: string): Promise<WorldSettings> {
        const { wams, skipped } = await this.readAllWamSettings(domain);
        const settings = migrateWorldSettingsFromWams(wams);
        if (skipped.length > 0) {
            settings.migrationWarnings = [
                ...(settings.migrationWarnings ?? []),
                `These maps could not be read and were left out: ${skipped.join(", ")}.`,
            ];
        }
        return settings;
    }

    public write(domain: string, settings: WorldSettings): Promise<void> {
        return this.limit(domain, () =>
            this.fileSystem.writeStringAsFile(
                this.path(domain),
                JSON.stringify(WorldSettings.parse(settings), null, 2),
            ),
        );
    }

    private path(domain: string): string {
        return mapPathUsingDomain(`/${WORLD_SETTINGS_FILE_NAME}`, domain);
    }

    private async readAllWamSettings(
        domain: string,
    ): Promise<{ wams: Record<string, WAMSettings | undefined>; skipped: string[] }> {
        const wamPaths = await this.fileSystem.listFiles(mapPathUsingDomain("/", domain), ".wam");
        const skipped: string[] = [];
        const entries = await Promise.all(
            wamPaths.map((wamPath) =>
                WorldSettingsService.readLimit(async (): Promise<[string, WAMSettings | undefined]> => {
                    const key = wamPath.replace(/^\//, "");
                    // A storage error throws: saving settings built from part of the maps would be wrong for good.
                    const content = await this.fileSystem.readFileAsString(mapPathUsingDomain(wamPath, domain));
                    try {
                        const wam = WAMFileFormat.parse(wamFileMigration.migrate(JSON.parse(content)));
                        return [key, wam.settings];
                    } catch (e) {
                        // A broken WAM must not block the world settings of every other map.
                        console.error(
                            `[${new Date().toISOString()}] Skipping "${wamPath}" in world settings migration`,
                            e,
                        );
                        skipped.push(key);
                        return [key, undefined];
                    }
                }),
            ),
        );
        return { wams: Object.fromEntries(entries), skipped: skipped.sort() };
    }

    private limit<T>(domain: string, fn: () => Promise<T>): Promise<T> {
        let limiter = this.limiters.get(domain);
        if (!limiter) {
            limiter = pLimit(1);
            this.limiters.set(domain, limiter);
        }
        const used = limiter;
        return used(async () => {
            try {
                return await fn();
            } finally {
                if (used.activeCount <= 1 && used.pendingCount === 0) {
                    this.limiters.delete(domain);
                }
            }
        });
    }
}

export const worldSettingsService = new WorldSettingsService(fileSystem);
