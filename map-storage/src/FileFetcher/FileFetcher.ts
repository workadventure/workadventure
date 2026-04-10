import type { Request, Response, NextFunction } from "express";
import { mapPath } from "../Services/PathMapper";
import type { FileSystemInterface } from "../Upload/FileSystemInterface";
import { CACHE_CONTROL } from "../Enum/EnvironmentVariable";

const staticFileExtensions = ["png", "css", "js", "jpg", "jpeg", "ico", "svg", "html", "htm", "jpeg"];

export function proxyFiles(fileSystem: FileSystemInterface) {
    return (req: Request, res: Response, next: NextFunction) => {
        const unescapedPath = decodeURIComponent(req.path.replace(/\+/g, " "));
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
