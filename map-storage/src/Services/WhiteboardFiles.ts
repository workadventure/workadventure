import type { Express, NextFunction, Request, Response } from "express";
import express from "express";
import { jwtVerify } from "jose";
import { z } from "zod";
import { getWhiteboardRights, WAMFileFormat } from "@workadventure/map-editor";
import type { FileSystemInterface } from "../Upload/FileSystemInterface";
import { SECRET_KEY } from "../Enum/EnvironmentVariable";
import { decodeStoragePath, mapPath, mapPathUsingUrl } from "./PathMapper";
import { WHITEBOARD_FILE_MAX_BYTES, WHITEBOARD_FILE_TYPES, WhiteboardLocation } from "./WhiteboardStorageService";

// The token the pusher signs for the map-storage (see handleMapStorageJwtQuery): the map and the user's tags.
const MapStorageToken = z.object({ wamUrl: z.string().url(), tags: z.array(z.string()).optional() });

const FILE_PATH =
    /^\/private\/whiteboards\/.+\/([A-Za-z0-9_-]{1,64})\/([A-Za-z0-9_-]{1,64})\/([A-Za-z0-9_-]{1,64})\.([a-z]{3,4})$/;

/**
 * The images pasted on whiteboards. They live under "private/" and only go to the people allowed to see the
 * board (read) or to draw on it (write), according to the rights of its area.
 */
export function registerWhiteboardFileRoutes(app: Express, fileSystem: FileSystemInterface): void {
    app.get("/private/whiteboards/{*splat}", (req, res, next) => {
        authorize(req, fileSystem, "read")
            .then((storagePath) => {
                if (storagePath === undefined) {
                    res.sendStatus(403);
                    return;
                }
                // Never rendered by the browser as a page (an SVG could carry a script): only fetched by the board.
                res.set("Content-Security-Policy", "sandbox");
                res.set("X-Content-Type-Options", "nosniff");
                res.set("Content-Disposition", "attachment");
                res.set("Cache-Control", "private, max-age=31536000, immutable");
                fileSystem.serveStaticFile(storagePath, res, next);
            })
            .catch(next);
    });

    app.put(
        "/private/whiteboards/{*splat}",
        express.raw({ type: Object.keys(WHITEBOARD_FILE_TYPES), limit: WHITEBOARD_FILE_MAX_BYTES }),
        (req: Request, res: Response, next: NextFunction) => {
            authorize(req, fileSystem, "write")
                .then(async (storagePath) => {
                    if (storagePath === undefined) {
                        res.sendStatus(403);
                        return;
                    }
                    const extension = WHITEBOARD_FILE_TYPES[req.get("Content-Type") ?? ""];
                    if (!Buffer.isBuffer(req.body) || req.body.length === 0 || !storagePath.endsWith("." + extension)) {
                        res.sendStatus(400);
                        return;
                    }
                    await fileSystem.writeByteArrayAsFile(storagePath, req.body);
                    res.sendStatus(204);
                })
                .catch(next);
        },
    );

    // Whatever else is asked under /private/whiteboards must not fall through to the public file server.
    app.all("/private/whiteboards/{*splat}", (req, res) => {
        res.sendStatus(404);
    });
}

/**
 * Returns the storage path of the requested image when the token allows the access, undefined otherwise.
 */
async function authorize(
    req: Request,
    fileSystem: FileSystemInterface,
    access: "read" | "write",
): Promise<string | undefined> {
    const match = FILE_PATH.exec(req.path);
    const token = req.query.token;
    if (!match || typeof token !== "string") {
        return undefined;
    }
    const [, areaId, propertyId, fileId, extension] = match;
    if (!Object.values(WHITEBOARD_FILE_TYPES).includes(extension)) {
        return undefined;
    }

    let wamUrl: URL;
    let tags: string[];
    try {
        const payload = MapStorageToken.parse(
            (await jwtVerify(token, new TextEncoder().encode(SECRET_KEY ?? ""))).payload,
        );
        wamUrl = new URL(payload.wamUrl);
        tags = payload.tags ?? [];
    } catch {
        return undefined;
    }

    // The token is valid for one map: the image must belong to that map's board.
    const storagePath = WhiteboardLocation.fromWamUrl(wamUrl, areaId, propertyId).filePath(fileId, extension);
    if (mapPath(decodeStoragePath(req.path), req) !== storagePath) {
        return undefined;
    }

    const wam = WAMFileFormat.parse(JSON.parse(await fileSystem.readFileAsString(mapPathUsingUrl(wamUrl))));
    const area = wam.areas.find((candidate) => candidate.id === areaId);
    if (!area?.properties.some((property) => property.id === propertyId && property.type === "whiteboard")) {
        return undefined;
    }
    const rights = getWhiteboardRights(area, tags);
    return (access === "read" ? rights.canRead : rights.canWrite) ? storagePath : undefined;
}
