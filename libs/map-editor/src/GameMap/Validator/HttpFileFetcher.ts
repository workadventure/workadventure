import axios from "axios";
import { FileFetcherInterface } from "./FileFetcherInterface";

/**
 * Checks if files exist on the web.
 */
export class HttpFileFetcher implements FileFetcherInterface {
    constructor(private mapUrl: string) {}

    async fileExists(filePath: string): Promise<boolean> {
        try {
            const url = new URL(filePath, this.mapUrl);
            const response = await axios.head(url.toString(), {
                maxBodyLength: 1000, // A HEAD request should not have a body anyway
                maxContentLength: 1_000_000, // Protection, just in case someone wants to send a large response to crash the server
                timeout: 10_000, // 10 seconds should be more than enough for a HEAD request
                validateStatus: () => true, // We don't want to throw an error if the file does not exist
            });
            return Promise.resolve(response.status < 400);
        } catch {
            return Promise.resolve(false);
        }
    }
}
