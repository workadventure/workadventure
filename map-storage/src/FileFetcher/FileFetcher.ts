import path from "path";
import type { Request, Response, NextFunction } from "express";
import { mapPath } from "../Services/PathMapper";
import type { FileSystemInterface } from "../Upload/FileSystemInterface";
import { CACHE_CONTROL } from "../Enum/EnvironmentVariable";

const staticFileExtensions = ["png", "css", "js", "jpg", "jpeg", "ico", "svg", "html", "htm", "jpeg"];

/**
 * True when the decoded path points into "private/" (whiteboards, uploaded files), however it is spelled:
 * "%77", "//", "/./", "/x/../" or another case would otherwise slip past the routes that guard it.
 */
export function isPrivatePath(unescapedPath: string): boolean {
    const firstSegment = path.posix
        .normalize("/" + unescapedPath)
        .split("/")
        .find((segment) => segment !== "");
    return firstSegment?.toLowerCase() === "private";
}

/**
 * Serves the stored files. "private/" is only served when the route already checked the caller (allowPrivate).
 */
export function proxyFiles(fileSystem: FileSystemInterface, { allowPrivate = false } = {}) {
    return (req: Request, res: Response, next: NextFunction) => {
        const unescapedPath = decodeURIComponent(req.path.replace(/\+/g, " "));
        if (!allowPrivate && isPrivatePath(unescapedPath)) {
            res.sendStatus(404);
            return;
        }
        const virtualPath = mapPath(unescapedPath, req);

        const fileName = req.path.split("/").pop();

        if (fileName) {
            // Use a regular expression to check if the file has a unique alphanumeric identifier of length between 6 and 32 characters in its name, and capture the file extension
            const regex = /[.-]([a-f0-9]{8})\.([a-z]{2,4})$/i;
            const match = fileName.match(regex);

            // Regular expression to match a UUID (used by WorkAdventure uploaded assets)
            const regexUuid = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}).*\.([a-z]{2,4})/i;
            const matchUuid = fileName.match(regexUuid);

            // Check if the regular expression matched and the file extension is one of the common static file extensions
            if (match && staticFileExtensions.includes(match[2])) {
                // Set the cache-control header to cache the file forever
                res.set("Cache-Control", "public, max-age=31536000, immutable");
            } else if (matchUuid && staticFileExtensions.includes(matchUuid[2])) {
                // Set the cache-control header to cache the file forever
                res.set("Cache-Control", "public, max-age=31536000, immutable");
            } else {
                res.set("Cache-control", CACHE_CONTROL);
            }
        }

        fileSystem.serveStaticFile(virtualPath, res, next);
    };
}
