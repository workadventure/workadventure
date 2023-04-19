import path from "node:path";
import { FileFetcherInterface } from "./FileFetcherInterface";

/**
 * Checks if files exist in a zip file.
 */
export class ZipFileFetcher implements FileFetcherInterface {
    constructor(private mapPath: string, private availableFiles: string[]) {}

    fileExists(filePath: string): Promise<boolean> {
        const resolvedPath = path.normalize(`${path.dirname(this.mapPath)}/${filePath}`);

        return Promise.resolve(this.availableFiles.includes(resolvedPath));
    }
}
