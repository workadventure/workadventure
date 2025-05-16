import {
    AreaDescriptionPropertyData,
    EntityDescriptionPropertyData,
    MapsCacheFileFormat,
    WAMFileFormat,
} from "@workadventure/map-editor";
import { WAMVersionHash } from "@workadventure/map-editor/src/WAMVersionHash";
import pLimit, { LimitFunction } from "p-limit";
import * as Sentry from "@sentry/node";
import { wamFileMigration } from "@workadventure/map-editor/src/Migrations/WamFileMigration";
import { fileSystem } from "../fileSystem";
import { FileSystemInterface } from "../Upload/FileSystemInterface";
import { ENABLE_WEB_HOOK, MAX_SIMULTANEOUS_FS_READS } from "../Enum/EnvironmentVariable";
import { mapPathUsingDomain } from "./PathMapper";
import { WebHookService } from "./WebHookService";

/**
 * Manages the cache file containing the list of maps.
 * Also, will call the webhook automatically when an update is made to the cache file.
 */
export class MapListService {
    /**
     * A map containing a limiter. For a given cache file, one cannot modify if another modification is in process.
     */
    private limiters: Map<string, LimitFunction>;

    public static readonly CACHE_NAME = "__cache.json";

    private static maxReadLimit = pLimit(MAX_SIMULTANEOUS_FS_READS);

    constructor(private fileSystem: FileSystemInterface, private webHookService: WebHookService) {
        this.limiters = new Map<string, LimitFunction>();
    }
    public generateCacheFile(domain: string): Promise<void> {
        return this.limit(domain, () => {
            return this.generateCacheFileNoLimit(domain);
        });
    }

    private async generateCacheFileNoLimit(domain: string): Promise<void> {
        const files = await fileSystem.listFiles(mapPathUsingDomain("/", domain), ".wam");

        const wamFiles: MapsCacheFileFormat = {
            version: WAMVersionHash,
            maps: {},
        };

        const promises: Promise<{ wamFilePath: string; wam: WAMFileFormat }>[] = [];
        for (const wamFilePath of files) {
            promises.push(
                MapListService.maxReadLimit(async () => {
                    return this.readWamFile(wamFilePath, domain);
                })
            );
        }

        /*const promises: Promise<{ wamFilePath: string; wam: WAMFileFormat }>[] = [];
        for (const wamFilePath of files) {
            promises.push(this.readWamFile(wamFilePath, domain));
        }*/

        const settledPromises = await Promise.allSettled(promises);
        for (const outcome of settledPromises) {
            if (outcome.status === "fulfilled") {
                wamFiles.maps[outcome.value.wamFilePath] = {
                    mapUrl: outcome.value.wam.mapUrl,
                    metadata: outcome.value.wam.metadata,
                    vendor: outcome.value.wam.vendor,
                };
            } else {
                Sentry.captureException(outcome.reason);
                console.error(`[${new Date().toISOString()}]`, outcome.reason);
            }
        }

        await this.writeCacheFileNoLimit(domain, wamFiles);
        if (ENABLE_WEB_HOOK) {
            this.webHookService.callWebHook(domain, undefined, "update");
        }
    }

    private async readWamFile(
        wamFilePath: string,
        domain: string
    ): Promise<{ wamFilePath: string; wam: WAMFileFormat }> {
        try {
            const virtualPath = mapPathUsingDomain(wamFilePath, domain);
            const wamFileString = await this.fileSystem.readFileAsString(virtualPath);
            return {
                wamFilePath: wamFilePath,
                wam: WAMFileFormat.parse(wamFileMigration.migrate(JSON.parse(wamFileString))),
            };
        } catch (e) {
            throw new Error(
                `Error while trying to read WAM file "${wamFilePath}" to generate cache: ${JSON.stringify(
                    e
                )}. Skipping this file for cache generation.`
            );
        }
    }

    private getLimiter(domain: string): LimitFunction {
        let limiter = this.limiters.get(domain);
        if (limiter === undefined) {
            limiter = pLimit(1);
            this.limiters.set(domain, limiter);
        }
        return limiter;
    }

    private freeLimiter(domain: string, limiter: LimitFunction): void {
        if (limiter.activeCount === 0 && limiter.pendingCount === 0) {
            this.limiters.delete(domain);
        }
    }

    private limit<T>(domain: string, fn: () => Promise<T>): Promise<T> {
        const limiter = this.getLimiter(domain);
        return limiter(async () => {
            try {
                return await fn();
            } finally {
                this.freeLimiter(domain, limiter);
            }
        });
    }

    public async updateWAMFileInCache(domain: string, wamFilePath: string, wamFile: WAMFileFormat): Promise<void> {
        return await this.limit(domain, async () => {
            const cacheFile = await this.readCacheFileNoLimit(domain);
            if (wamFilePath.startsWith("/")) {
                wamFilePath = wamFilePath.substring(1);
            }

            cacheFile.maps[wamFilePath] = {
                mapUrl: wamFile.mapUrl,
                metadata: {
                    ...wamFile.metadata,
                    areasSearchable: wamFile.areas.reduce((nb, area) => {
                        if (
                            area.properties &&
                            area.properties.find((property) => (property as AreaDescriptionPropertyData).searchable)
                        ) {
                            return nb + 1;
                        }
                        return nb;
                    }, 0),
                    entitiesSearchable: Object.values(wamFile.entities).reduce((nb, entity) => {
                        if (
                            entity.properties &&
                            entity.properties.find((property) => (property as EntityDescriptionPropertyData).searchable)
                        ) {
                            return nb + 1;
                        }
                        return nb;
                    }, 0),
                },
                vendor: wamFile.vendor,
            };
            await this.writeCacheFileNoLimit(domain, cacheFile);
            if (ENABLE_WEB_HOOK) {
                this.webHookService.callWebHook(domain, wamFilePath, "update");
            }
        });
    }

    public async deleteWAMFileInCache(domain: string, wamFilePath: string): Promise<void> {
        return await this.limit(domain, async () => {
            const cacheFile = await this.readCacheFileNoLimit(domain);
            if (wamFilePath.startsWith("/")) {
                wamFilePath = wamFilePath.substring(1);
            }
            delete cacheFile.maps[wamFilePath];
            await this.writeCacheFileNoLimit(domain, cacheFile);
            if (ENABLE_WEB_HOOK) {
                this.webHookService.callWebHook(domain, wamFilePath, "delete");
            }
        });
    }

    public readCacheFile(domain: string): Promise<MapsCacheFileFormat> {
        return this.limit(domain, async () => {
            return this.readCacheFileNoLimit(domain);
        });
    }

    private async readCacheFileNoLimit(domain: string, nbTry = 0): Promise<MapsCacheFileFormat> {
        try {
            const cacheFilePath = mapPathUsingDomain("/" + MapListService.CACHE_NAME, domain);
            const cacheFileString = await this.fileSystem.readFileAsString(cacheFilePath);
            const cacheFile = MapsCacheFileFormat.parse(JSON.parse(cacheFileString));
            if (cacheFile.version !== WAMVersionHash) {
                // The cache file might not be up to the latest version. We need to regenerate it.
                throw new Error(
                    "The cache file for domain " +
                        domain +
                        " might not be up to the latest version. We need to regenerate it."
                );
            }
            return cacheFile;
        } catch (e: unknown) {
            if (nbTry === 0) {
                console.log(`[${new Date().toISOString()}] Trying to regenerate the cache file`);
                // The file does not exist. Let's generate it
                await this.generateCacheFileNoLimit(domain);
                return this.readCacheFileNoLimit(domain, nbTry + 1);
            }
            console.error(
                `[${new Date().toISOString()}] Error while trying to read a cache file for domain ${domain}:`,
                e
            );
            Sentry.captureException(
                `Error while trying to read a cache file for domain ${domain}: ${JSON.stringify(e)}`
            );
            throw e;
        }
    }

    private async writeCacheFileNoLimit(domain: string, cacheFile: MapsCacheFileFormat): Promise<void> {
        const cacheFilePath = mapPathUsingDomain("/" + MapListService.CACHE_NAME, domain);
        await this.fileSystem.writeStringAsFile(cacheFilePath, JSON.stringify(cacheFile, null, 2));
    }
}
