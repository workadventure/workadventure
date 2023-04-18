import { MapsCacheFileFormat, WAMFileFormat } from "@workadventure/map-editor";
import pLimit from "p-limit";
import { fileSystem } from "../fileSystem";
import { FileSystemInterface } from "../Upload/FileSystemInterface";
import { mapPathUsingDomain } from "./PathMapper";
import {WebHookService} from "./WebHookService";

/**
 * Manages the cache file containing the list of maps.
 * Also, will call the webhook automatically when an update is made to the cache file.
 */
export class MapListService {
    /**
     * A map containing a limiter. For a given cache file, one cannot modify if another modification is in process.
     */
    private limiters: Map<string, pLimit.Limit>;

    public static readonly CACHE_NAME = "__cache.json";

    constructor(private fileSystem: FileSystemInterface, private webHookService: WebHookService) {
        this.limiters = new Map<string, pLimit.Limit>();
    }
    public generateCacheFile(domain: string): Promise<void> {
        return this.limit(domain, async () => {
            const files = await fileSystem.listFiles(mapPathUsingDomain("/", domain), ".wam");

            const wamFiles: MapsCacheFileFormat = {};

            for (const wamFilePath of files) {
                const virtualPath = mapPathUsingDomain(wamFilePath, domain);
                const wamFileString = await this.fileSystem.readFileAsString(virtualPath);
                const wamFile = WAMFileFormat.parse(JSON.parse(wamFileString));
                wamFiles[wamFilePath] = {
                    mapUrl: wamFile.mapUrl,
                    metadata: wamFile.metadata,
                    vendor: wamFile.vendor,
                };
            }

            await fileSystem.writeStringAsFile(
                mapPathUsingDomain("/" + MapListService.CACHE_NAME, domain),
                JSON.stringify(wamFiles, null, 2)
            );
            this.webHookService.callWebHook(domain, undefined, "update");
        });
    }

    private getLimiter(domain: string): pLimit.Limit {
        let limiter = this.limiters.get(domain);
        if (limiter === undefined) {
            limiter = pLimit(1);
            this.limiters.set(domain, limiter);
        }
        return limiter;
    }

    private freeLimiter(domain: string, limiter: pLimit.Limit): void {
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

    public updateWAMFileInCache(domain: string, wamFilePath: string, wamFile: WAMFileFormat): Promise<void> {
        return this.limit(domain, async () => {
            const cacheFilePath = mapPathUsingDomain("/" + MapListService.CACHE_NAME, domain);
            const cacheFileString = await this.fileSystem.readFileAsString(cacheFilePath);
            const cacheFile = MapsCacheFileFormat.parse(JSON.parse(cacheFileString));
            if (wamFilePath.startsWith("/")) {
                wamFilePath = wamFilePath.substring(1);
            }
            cacheFile[wamFilePath] = {
                mapUrl: wamFile.mapUrl,
                metadata: wamFile.metadata,
                vendor: wamFile.vendor,
            };
            await this.fileSystem.writeStringAsFile(cacheFilePath, JSON.stringify(cacheFile, null, 2));
            this.webHookService.callWebHook(domain, wamFilePath, "update");
        });
    }

    public deleteWAMFileInCache(domain: string, wamFilePath: string): Promise<void> {
        return this.limit(domain, async () => {
            const cacheFilePath = mapPathUsingDomain("/" + MapListService.CACHE_NAME, domain);
            const cacheFileString = await this.fileSystem.readFileAsString(cacheFilePath);
            const cacheFile = MapsCacheFileFormat.parse(JSON.parse(cacheFileString));
            if (wamFilePath.startsWith("/")) {
                wamFilePath = wamFilePath.substring(1);
            }
            delete cacheFile[wamFilePath];
            await this.fileSystem.writeStringAsFile(cacheFilePath, JSON.stringify(cacheFile, null, 2));
            this.webHookService.callWebHook(domain, wamFilePath, "delete");
        });
    }

    public readCacheFile(domain: string): Promise<MapsCacheFileFormat> {
        return this.limit(domain, async () => {
            const cacheFilePath = mapPathUsingDomain("/" + MapListService.CACHE_NAME, domain);
            const cacheFileString = await this.fileSystem.readFileAsString(cacheFilePath);
            return MapsCacheFileFormat.parse(JSON.parse(cacheFileString));
        });
    }
}
