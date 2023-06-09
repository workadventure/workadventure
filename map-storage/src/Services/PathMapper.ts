import path from "node:path";
import { Request } from "express";
import { PATH_PREFIX, USE_DOMAIN_NAME_IN_PATH } from "../Enum/EnvironmentVariable";

/**
 * Maps a path to the storage path.
 * The returned value never starts with "/".
 */
export function mapPath(filePath: string, req: Request): string {
    return mapPathUsingDomain(filePath, req.headers["x-forwarded-host"]?.toString() ?? req.hostname);
}

export function mapPathUsingDomainWithPrefix(filePath: string, domain: string): string {
    if (PATH_PREFIX) {
        if (filePath.startsWith(PATH_PREFIX)) {
            filePath = filePath.replace(PATH_PREFIX, "");
        }
    }
    return mapPathUsingDomain(filePath, domain);
}

export function mapPathUsingDomain(filePath: string, domain: string): string {
    if (filePath.startsWith("/")) {
        filePath = filePath.substring(1);
    }
    if (USE_DOMAIN_NAME_IN_PATH) {
        if (domain.includes("..") || domain.includes("/")) {
            throw new Error("Invalid host name provided");
        }
        return path.normalize(domain + "/" + filePath);
    }
    return filePath;
}
