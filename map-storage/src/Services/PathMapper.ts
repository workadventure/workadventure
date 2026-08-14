import path from "path";
import type { Request } from "express";
import { PATH_PREFIX, USE_DOMAIN_NAME_IN_PATH } from "../Enum/EnvironmentVariable";

/**
 * Maps a path to the storage path.
 * The returned value never starts with "/".
 */
export function mapPath(filePath: string, req: Request): string {
    return mapPathUsingDomain(filePath, req.headers["x-forwarded-host"]?.toString() ?? req.hostname);
}

/**
 * Turns the percent-encoded path of a URL into the literal path used as a storage key.
 *
 * Storage keys are literal: an upload writes the entry names it is given (see UploadController),
 * so a map in a directory named "My maps" is stored under "My maps/foo.wam". A URL carrying that
 * same map spells it "/My%20maps/foo.wam" (`URL.pathname` and `req.path` are both percent-encoded),
 * so it MUST be decoded before it is used to read or write, otherwise we look up a key that does
 * not exist.
 *
 * Decoding is done segment by segment so that an encoded separator ("%2F") cannot silently add a
 * path level. Segments that decode to a separator or to ".." are rejected rather than normalized,
 * so a caller cannot escape the domain directory.
 */
export function decodeStoragePath(pathname: string): string {
    return pathname
        .split("/")
        .map((segment) => {
            let decoded: string;
            try {
                decoded = decodeURIComponent(segment);
            } catch {
                // Not valid percent-encoding (typically a literal "%" in a file name). The segment
                // is then already the literal storage key, so keep it untouched.
                return segment;
            }
            // A backslash is a separator for path.normalize() on Windows, so an encoded one would
            // otherwise let a segment normalize its way out of the domain directory.
            if (decoded === ".." || decoded.includes("/") || decoded.includes("\\")) {
                throw new Error("Invalid path provided");
            }
            return decoded;
        })
        .join("/");
}

/**
 * Maps the path of a URL (percent-encoded) to the storage path.
 */
export function mapPathUsingUrl(url: URL): string {
    return mapPathUsingDomainWithPrefix(decodeStoragePath(url.pathname), url.hostname);
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
