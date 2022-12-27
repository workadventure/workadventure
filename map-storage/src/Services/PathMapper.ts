import { Request } from "express";
import { USE_DOMAIN_NAME_IN_PATH } from "../Enum/EnvironmentVariable";
import path from "node:path";

/**
 * Maps a path to the storage path.
 * The returned value never starts with "/".
 */
export function mapPath(filePath: string, req: Request): string {
    if (filePath.startsWith("/")) {
        filePath = filePath.substring(1);
    }
    if (USE_DOMAIN_NAME_IN_PATH) {
        const hostname = req.hostname;
        if (hostname.includes("..") || hostname.includes("/")) {
            throw new Error("Invalid host name provided");
        }
        return path.normalize(hostname + "/" + filePath);
    }
    return filePath;
}
