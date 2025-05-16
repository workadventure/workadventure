import * as fs from "fs";
import path from "node:path";
import { z, ZodError } from "zod";
import { Express, Request } from "express";
import multer from "multer";
import pLimit, { LimitFunction } from "p-limit";
import archiver from "archiver";
import * as unzipper from "unzipper";
import * as jsonpatch from "fast-json-patch";
import { MapValidator, OrganizedErrors } from "@workadventure/map-editor/src/GameMap/MapValidator";
import { WAMFileFormat } from "@workadventure/map-editor";
import { ZipFileFetcher } from "@workadventure/map-editor/src/GameMap/Validator/ZipFileFetcher";
import { HttpFileFetcher } from "@workadventure/map-editor/src/GameMap/Validator/HttpFileFetcher";
import { wamFileMigration } from "@workadventure/map-editor/src/Migrations/WamFileMigration";
import { Operation } from "fast-json-patch";
import { generateErrorMessage } from "zod-error";
import * as Sentry from "@sentry/node";
import bodyParser from "body-parser";
import { ITiledMap } from "@workadventure/tiled-map-type-guard";
import axios from "axios";
import { mapPath } from "../Services/PathMapper";
import { ENTITY_COLLECTION_URLS, MAX_UNCOMPRESSED_SIZE, WAM_TEMPLATE_URL } from "../Enum/EnvironmentVariable";
import { passportAuthenticator } from "../Services/Authentication";
import { uploadDetector } from "../Services/UploadDetector";
import { MapListService } from "../Services/MapListService";
import { mapsManager } from "../MapsManager";
import { _axios } from "../Services/axiosInstance";
import { FileSystemInterface } from "./FileSystemInterface";
import { FileNotFoundError } from "./FileNotFoundError";

const limit = pLimit(10);

const upload = multer({
    storage: multer.diskStorage({}),
    limits: {
        fileSize: MAX_UNCOMPRESSED_SIZE, // The compressed size cannot be bigger than the uncompressed size so it is safe to put this limit.
    },
});

export class UploadController {
    /**
     * A map containing a limiter. For a given directory, one cannot upload if another upload is in process.
     * This is not perfect (because we should actually forbid an upload on "/" if "/foo" is being uploaded), but it's
     * already a start of a check.
     */
    private uploadLimiter: Map<string, LimitFunction>;

    constructor(private app: Express, private fileSystem: FileSystemInterface, private mapListService: MapListService) {
        this.uploadLimiter = new Map<string, LimitFunction>();
        this.index();
        this.postUpload();
        this.putUpload();
        this.getDownload();
        this.move();
        this.copy();
        this.deleteFile();
        this.getMaps();
        this.patch();
    }

    private index() {
        this.app.get("/", passportAuthenticator, (req, res) => {
            res.redirect(`${process.env.PATH_PREFIX || ""}/ui/`);
        });
    }

    private postUpload() {
        this.app.post("/upload", passportAuthenticator, upload.single("file"), (req, res, next) => {
            (async () => {
                // Make sure a file was uploaded
                if (!req.file) {
                    res.status(400).send("No file was uploaded.");
                    return;
                }

                // Get the uploaded file
                const zipFile = req.file;

                const Body = z.object({
                    directory: z.string().optional(),
                });

                const directory = Body.parse(req.body).directory || "";

                if (directory.includes("..")) {
                    // Attempt to override filesystem. That's a hack!
                    res.status(400).send("Invalid directory");
                    return;
                }

                // Let's explicitly forbid 2 uploads from running at the same time using a p-limit of 1.
                // Uploads will be serialized.
                const virtualDirectory = mapPath(directory, req);
                let limiter = this.uploadLimiter.get(virtualDirectory);
                if (limiter === undefined) {
                    limiter = pLimit(1);
                    this.uploadLimiter.set(virtualDirectory, limiter);
                }

                await limiter(async () => {
                    // Read the contents of the ZIP archive
                    const zipDirectory = await unzipper.Open.file(zipFile.path);
                    const zipEntries = zipDirectory.files.filter(
                        (zipEntry) => zipEntry.type !== "Directory" && this.filterFile(zipEntry.path)
                    );

                    let totalSize = 0;
                    for (const zipEntry of zipEntries) {
                        totalSize += zipEntry.uncompressedSize;
                    }

                    const availableFiles = zipEntries.map((entry) => entry.path);

                    if (totalSize > MAX_UNCOMPRESSED_SIZE) {
                        res.status(413).send(
                            `File too large. Unzipped files should be less than ${MAX_UNCOMPRESSED_SIZE} bytes.`
                        );
                        return;
                    }

                    const errors: { [key: string]: Partial<OrganizedErrors> } = {};

                    for (const zipEntry of zipEntries) {
                        // Let's validate the archive
                        const zipFileFetcher = new ZipFileFetcher(zipEntry.path, availableFiles);

                        const mapValidator = new MapValidator("error", zipFileFetcher);

                        const extension = path.extname(zipEntry.path);
                        if (extension === ".json") {
                            // Get the content of the file as a string
                            // We handle one zip entry at a time on purpose
                            // eslint-disable-next-line no-await-in-loop
                            const buffer = await zipEntry.buffer();
                            const content = buffer.toString("utf-8");

                            if (mapValidator.doesStringLooksLikeMap(content)) {
                                // We forbid Maps in JSON format.
                                errors[zipEntry.path] = {
                                    map: [
                                        {
                                            type: "error",
                                            message:
                                                'Invalid file extension. Maps should end with the ".tmj" extension.',
                                            details: "",
                                        },
                                    ],
                                };
                                continue;
                            }
                        }

                        if (extension === ".wam") {
                            // Get the content of the file as a string
                            // We handle one zip entry at a time on purpose
                            // eslint-disable-next-line no-await-in-loop
                            const buffer = await zipEntry.buffer();
                            const content = buffer.toString("utf-8");

                            const result = mapValidator.validateWAMFile(content);
                            if (!result.ok) {
                                errors[zipEntry.path] = {
                                    map: [
                                        {
                                            type: "error",
                                            message: "Invalid WAM file format.",
                                            details: generateErrorMessage(result.error.issues ?? []),
                                        },
                                    ],
                                };
                            }
                            continue;
                        }

                        if (extension !== ".tmj") {
                            continue;
                        }

                        // Get the content of the file as a string
                        // We handle one zip entry at a time on purpose
                        // eslint-disable-next-line no-await-in-loop
                        const buffer = await zipEntry.buffer();
                        const content = buffer.toString("utf-8");

                        // eslint-disable-next-line no-await-in-loop
                        const result = await mapValidator.validateStringMap(content);
                        if (!result.ok) {
                            errors[zipEntry.path] = result.error;
                        }
                    }

                    if (Object.keys(errors).length > 0) {
                        res.status(400).json(errors);
                        return;
                    }

                    const filesPathsFromZip = zipEntries
                        .filter((zipEntry) => zipEntry.path.includes(".wam") || zipEntry.path.includes(".tmj"))
                        .map((zipEntry) => zipEntry.path);

                    // Delete all files in the given filesystem (disk or s3) with the exception of some .wam files
                    await this.fileSystem.deleteFilesExceptWAM(mapPath(directory, req), filesPathsFromZip);

                    const promises: Promise<void>[] = [];
                    const wamToPurge: string[] = [];
                    const wamFilesNames = zipEntries
                        .filter((zipEntry) => zipEntry.path.includes(".wam"))
                        .map((zipEntry) => path.parse(zipEntry.path).name);
                    // Iterate over the entries in the ZIP archive
                    for (const zipEntry of zipEntries) {
                        const key = mapPath(path.join(directory, zipEntry.path), req);
                        // Store the file
                        promises.push(this.fileSystem.writeFile(zipEntry, key));
                        if (path.extname(key) === ".tmj") {
                            if (!wamFilesNames.includes(path.parse(zipEntry.path).name)) {
                                promises.push(this.createWAMFileIfMissing(key, zipEntry, zipDirectory));
                            }
                        } else if (path.extname(key) === ".wam") {
                            const wamUrl = `${req.protocol}://${req.hostname}${directory}/${zipEntry.path}`;
                            wamToPurge.push(wamUrl);
                        }
                    }

                    await Promise.all(promises);

                    // No need to close the directory with unzipper
                    // Delete the uploaded ZIP file from the disk
                    fs.unlink(zipFile.path, (err) => {
                        if (err) {
                            console.error(`[${new Date().toISOString()}] Error deleting file:`, err);
                            Sentry.captureException(`Error deleting file: ${JSON.stringify(err)}`);
                        }
                    });
                    for (const wamUrl of wamToPurge) {
                        uploadDetector.refresh(wamUrl).catch((err) => {
                            console.error(`[${new Date().toISOString()}]`, err);
                            Sentry.captureException(err);
                        });
                    }
                    await this.mapListService.generateCacheFile(req.hostname);

                    res.send("File successfully uploaded.");
                });

                if (limiter.activeCount === 0 && limiter.pendingCount === 0) {
                    this.uploadLimiter.delete(virtualDirectory);
                }
            })().catch((e) => next(e));
        });
    }

    private putUpload() {
        this.app.put(
            "/*",
            passportAuthenticator,
            upload.single("file"),
            bodyParser.raw({
                inflate: true,
                limit: MAX_UNCOMPRESSED_SIZE,
                type: "application/octet-stream",
            }),
            (req, res, next) => {
                (async () => {
                    // Make sure a file was uploaded
                    if (req.is("multipart/form-data") && !req.file) {
                        res.status(400).send({
                            request: [
                                {
                                    type: "error",
                                    message: "No file was uploaded",
                                    details: "",
                                },
                            ],
                        });
                        return;
                    }
                    /*if (!req.is("multipart/form-data")) {
                        // If there is no "file", maybe the user tried to upload the file by passing everything in the body directly.
                        const buffer = req.body;
                    }*/

                    // Get the uploaded file
                    const file = req.file;

                    const filePath = req.path;

                    if (filePath.includes("..")) {
                        // Attempt to override filesystem. That' a hack!
                        res.status(400).send("Invalid path");
                        return;
                    }

                    // Let's explicitly forbid 2 uploads from running at the same time using a p-limit of 1.
                    // Uploads will be serialized.
                    const virtualPath = mapPath(filePath, req);
                    let limiter = this.uploadLimiter.get(filePath);
                    if (limiter === undefined) {
                        limiter = pLimit(1);
                        this.uploadLimiter.set(virtualPath, limiter);
                    }

                    await limiter(async () => {
                        if (file && file.size > MAX_UNCOMPRESSED_SIZE) {
                            res.status(413).send(
                                `File too large. Files should be less than ${MAX_UNCOMPRESSED_SIZE} bytes.`
                            );
                            return;
                        }

                        // Let's validate the archive
                        const mapValidator = new MapValidator("error", new HttpFileFetcher(req.url));

                        let errors: Partial<OrganizedErrors> = {};

                        let content: string;
                        if (file) {
                            content = await fs.promises.readFile(file.path, "utf8");
                        } else {
                            if (typeof req.body === "object") {
                                content = JSON.stringify(req.body);
                            } else {
                                throw new Error(
                                    "Unsupported mime-type. Allowed types are application/json and multipart/form-data."
                                );
                            }
                        }

                        const extension = path.extname(filePath);
                        let wamFile: WAMFileFormat | undefined;
                        if (extension === ".json" && mapValidator.doesStringLooksLikeMap(content)) {
                            // We forbid Maps in JSON format.
                            errors = {
                                map: [
                                    {
                                        type: "error",
                                        message: 'Invalid file extension. Maps should end with the ".tmj" extension.',
                                        details: "",
                                    },
                                ],
                            };
                        } else if (extension === ".wam") {
                            const result = mapValidator.validateWAMFile(content);
                            if (!result.ok) {
                                errors = {
                                    map: [
                                        {
                                            type: "error",
                                            message: "Invalid WAM file format.",
                                            details: generateErrorMessage(result.error.issues ?? []),
                                        },
                                    ],
                                };
                            } else {
                                wamFile = result.value;
                            }
                        } else if (extension === ".tmj") {
                            const result = await mapValidator.validateStringMap(content);
                            if (!result.ok) {
                                errors = result.error;
                            }
                        }

                        if (Object.keys(errors).length > 0) {
                            res.status(400).json(errors);
                            return;
                        }

                        // TODO: create a "stream" version of this method to avoid loading the whole file in memory
                        await this.fileSystem.writeStringAsFile(virtualPath, content);

                        // Delete the uploaded file from the disk
                        if (file) {
                            fs.unlink(file.path, (err) => {
                                if (err) {
                                    console.error(`[${new Date().toISOString()}] Error deleting file:`, err);
                                    Sentry.captureException(`Error deleting file: ${JSON.stringify(err)}`);
                                }
                            });
                        }

                        if (extension === ".wam" && wamFile) {
                            uploadDetector.refresh(this.getFullUrlFromRequest(req)).catch((err) => {
                                console.error(`[${new Date().toISOString()}]`, err);
                                Sentry.captureException(err);
                            });
                            await this.mapListService.updateWAMFileInCache(req.hostname, filePath, wamFile);
                        }

                        res.send("File successfully uploaded.");
                    });

                    if (limiter.activeCount === 0 && limiter.pendingCount === 0) {
                        this.uploadLimiter.delete(virtualPath);
                    }
                })().catch((e) => {
                    console.error(`[${new Date().toISOString()}]`, e);
                    Sentry.captureException(e);
                    next(e);
                });
            }
        );
    }

    private patch() {
        /**
         * This endpoint is used to patch aany WAM file using the JSON Patch notation.
         */
        this.app.patch("/*.wam", passportAuthenticator, (req, res, next) => {
            (async () => {
                const filePath = req.path;

                if (filePath.includes("..")) {
                    // Attempt to override filesystem. That' a hack!
                    res.status(400).send("Invalid path");
                    return;
                }

                // Let's explicitly forbid 2 patches from running at the same time using a p-limit of 1.
                // Uploads will be serialized.
                const virtualPath = mapPath(filePath, req);
                let limiter = this.uploadLimiter.get(filePath);
                if (limiter === undefined) {
                    limiter = pLimit(1);
                    this.uploadLimiter.set(virtualPath, limiter);
                }

                await limiter(async () => {
                    const mapValidator = new MapValidator("error", new HttpFileFetcher(req.url));

                    let errors: Partial<OrganizedErrors> = {};

                    const content = WAMFileFormat.parse(
                        wamFileMigration.migrate(JSON.parse(await this.fileSystem.readFileAsString(virtualPath)))
                    );

                    // Let's make things easy: if "vendor" or "metadata" is not defined, let's add an empty object.
                    if (!content.vendor) {
                        content.vendor = {};
                    }
                    if (!content.metadata) {
                        content.metadata = {};
                    }

                    const patchedContent = jsonpatch.applyPatch(
                        content,
                        req.body as Operation[],
                        true,
                        false
                    ).newDocument;

                    const patchedContentString = JSON.stringify(patchedContent);
                    const result = mapValidator.validateWAMFile(patchedContentString);
                    if (!result.ok) {
                        errors = {
                            map: [
                                {
                                    type: "error",
                                    message: "Invalid WAM file format.",
                                    details: generateErrorMessage(result.error.issues ?? []),
                                },
                            ],
                        };
                        res.status(400).json(errors);
                        return;
                    }

                    await this.fileSystem.writeStringAsFile(virtualPath, patchedContentString);

                    uploadDetector.refresh(this.getFullUrlFromRequest(req)).catch((err) => {
                        console.error(`[${new Date().toISOString()}]`, err);
                        Sentry.captureException(err);
                    });

                    await this.mapListService.updateWAMFileInCache(req.hostname, filePath, result.value);

                    res.json({ success: true });
                });

                if (limiter.activeCount === 0 && limiter.pendingCount === 0) {
                    this.uploadLimiter.delete(virtualPath);
                }
            })().catch((e) => {
                console.error(`[${new Date().toISOString()}]`, e);
                Sentry.captureException(e);
                next(e);
            });
        });
    }

    private async createWAMFileIfMissing(
        tmjKey: string,
        zipEntry: unzipper.File,
        zip: unzipper.CentralDirectory
    ): Promise<void> {
        const wamPath = tmjKey.slice().replace(".tmj", ".wam");
        if (!(await this.fileSystem.exist(wamPath))) {
            // Get the content of the file as a string
            const buffer = await zipEntry.buffer();
            const tmjString = buffer.toString("utf-8");

            // Using "as" instead of Zod because the Zod check was already performed before.
            const tmjContent = JSON.parse(tmjString) as ITiledMap;
            await this.fileSystem.writeStringAsFile(
                wamPath,
                JSON.stringify(await this.getFreshWAMFileContent(`./${path.basename(tmjKey)}`, tmjContent), null, 4)
            );
        }
    }

    private async getFreshWAMFileContent(tmjFilePath: string, tmjContent: ITiledMap): Promise<WAMFileFormat> {
        const nameProperty = tmjContent.properties?.find((property) => property.name === "mapName");
        let name: string | undefined;
        if (nameProperty?.type === "string") {
            name = nameProperty.value;
        }

        const descriptionProperty = tmjContent.properties?.find((property) => property.name === "mapDescription");
        let description: string | undefined;
        if (descriptionProperty?.type === "string") {
            description = descriptionProperty.value;
        }

        const thumbnailProperty = tmjContent.properties?.find((property) => property.name === "mapImage");
        let thumbnail: string | undefined;
        if (thumbnailProperty?.type === "string") {
            thumbnail = thumbnailProperty.value;
        }

        const copyrightProperty = tmjContent.properties?.find((property) => property.name === "mapCopyright");
        let copyright: string | undefined;
        if (copyrightProperty?.type === "string") {
            copyright = copyrightProperty.value;
        }

        let wamFile: WAMFileFormat | undefined;

        if (WAM_TEMPLATE_URL) {
            const response = await axios.get(WAM_TEMPLATE_URL);
            wamFile = WAMFileFormat.parse(wamFileMigration.migrate(response.data));
            wamFile.mapUrl = tmjFilePath;
            wamFile.metadata = {
                ...wamFile.metadata,
                name,
                description,
                thumbnail,
                copyright,
            };
        } else {
            const urls = ENTITY_COLLECTION_URLS?.split(",").filter((url) => url != "") ?? [];
            wamFile = {
                version: wamFileMigration.getLatestVersion(),
                mapUrl: tmjFilePath,
                areas: [],
                entities: {},
                entityCollections: urls.map((url) => ({
                    url,
                    type: "file",
                })),
                settings: undefined,
                metadata: {
                    name,
                    description,
                    thumbnail,
                    copyright,
                },
            };
        }
        return wamFile;
    }
    /**
     * Let's filter out any file starting with "."
     */
    private filterFile(path: string): boolean {
        const paths = path.split(/[/\\]/);
        for (const subPath of paths) {
            if (subPath.startsWith(".")) {
                return false;
            }
        }
        return true;
    }

    private getDownload() {
        this.app.get("/download", passportAuthenticator, (req, res, next) => {
            (async () => {
                const directoryRaw = req.query.directory;
                const directory = z.string().optional().parse(directoryRaw) || "./";

                if (directory.includes("..")) {
                    // Attempt to override filesystem. That' a hack!
                    res.status(400).send("Invalid directory");
                    return;
                }

                // Let's explicitly forbid 2 uploads from running at the same time using a p-limit of 1.
                // Uploads will be serialized.
                const virtualDirectory = mapPath(directory, req);

                let archiveName: string | undefined;
                if (directory) {
                    const baseName = path.basename(directory);
                    if (baseName !== "." && baseName !== "") {
                        archiveName = baseName + ".zip";
                    }
                }
                if (archiveName === undefined) {
                    archiveName = "map.zip";
                }

                res.attachment(archiveName);

                const archive = archiver("zip", {
                    zlib: { level: 9 }, // Sets the compression level.
                });

                // good practice to catch warnings (ie stat failures and other non-blocking errors)
                archive.on("warning", function (err) {
                    if (err.code === "ENOENT") {
                        // log warning
                        console.warn(`[${new Date().toISOString()}] File not found: `, err);
                    } else {
                        console.error(`[${new Date().toISOString()}] A warning occurred while Zipping file: `, err);
                        Sentry.captureException(`A warning occurred while Zipping file: ${JSON.stringify(err)}`);
                    }
                });

                // good practice to catch this error explicitly
                archive.on("error", function (err) {
                    console.error(`[${new Date().toISOString()}] An error occurred while Zipping file: `, err);
                    Sentry.captureException(`An error occurred while Zipping file: ${JSON.stringify(err)}`);
                    res.status(500).send("An error occurred");
                });

                // pipe archive data to the file
                archive.pipe(res);

                await this.fileSystem.archiveDirectory(archive, virtualDirectory);

                await archive.finalize();
            })().catch((e) => {
                console.error(`[${new Date().toISOString()}]`, e);
                Sentry.captureException(e);
                next(e);
            });
        });
    }

    private deleteFile() {
        this.app.delete("/*", passportAuthenticator, (req, res, next) => {
            (async () => {
                const filePath = req.path;

                if (filePath.includes("..")) {
                    // Attempt to override filesystem. That' a hack!
                    res.status(400).send("Invalid path");
                    return;
                }

                const virtualPath = mapPath(filePath, req);

                const isWamFile = filePath.endsWith(".wam");

                if (isWamFile) {
                    const gameMap = await mapsManager.getOrLoadGameMap(virtualPath);
                    const areas = gameMap.getGameMapAreas()?.getAreas().values();

                    if (areas) {
                        const promises = Array.from(areas).reduce((acc, currArea) => {
                            currArea.properties.forEach((property) => {
                                const resourceUrl = property.resourceUrl;
                                if (resourceUrl) {
                                    acc.push(limit(() => _axios.delete(resourceUrl, { data: property })));
                                }
                            });
                            return acc;
                        }, [] as Promise<unknown>[]);

                        try {
                            await Promise.all(promises);
                        } catch (error) {
                            console.error(
                                `[${new Date().toISOString()}] Failed to execute all request on resourceUrl`,
                                error
                            );
                            Sentry.captureMessage(
                                `Failed to execute all request on resourceUrl ${JSON.stringify(error)}`
                            );
                        }
                    }
                }

                await this.fileSystem.deleteFiles(virtualPath);

                if (isWamFile) {
                    // FIXME: We should call the refresh for all WAM files deleted (in subdirectories too)
                    uploadDetector.refresh(this.getFullUrlFromRequest(req)).catch((err) => {
                        console.error(`[${new Date().toISOString()}]`, err);
                        Sentry.captureException(err);
                    });
                    //await this.mapListService.deleteWAMFileInCache(req.hostname, filePath);
                }

                await this.mapListService.generateCacheFile(req.hostname);

                res.sendStatus(204);
            })().catch((e) => {
                console.error(`[${new Date().toISOString()}]`, e);
                Sentry.captureException(e);
                next(e);
            });
        });
    }

    private getFullUrlFromRequest(req: Request): string {
        return `${req.protocol}://${req.hostname}${req.header("x-forwarded-prefix") || ""}${req.originalUrl}`;
    }

    private move() {
        this.app.post("/move", passportAuthenticator, (req, res, next) => {
            (async () => {
                const verifiedBody = z
                    .object({
                        source: z.string(),
                        destination: z.string(),
                    })
                    .safeParse(req.body);

                if (!verifiedBody.success) {
                    res.status(400).send("Invalid request :" + verifiedBody.error.message);
                    return;
                }

                const { source, destination } = verifiedBody.data;

                if (source.includes("..") || destination.includes("..")) {
                    // Attempt to override filesystem. That' a hack!
                    res.status(400).send("Invalid directory");
                    return;
                }

                const virtualPath = mapPath(source, req);
                const newVirtualPath = mapPath(destination, req);

                if (await this.fileSystem.exist(newVirtualPath)) {
                    res.status(409).send("Destination already exist!");
                    return;
                }

                await this.fileSystem.move(virtualPath, newVirtualPath);
                await this.mapListService.generateCacheFile(req.hostname);
                res.sendStatus(200);
            })().catch((e) => {
                console.error(`[${new Date().toISOString()}]`, e);
                Sentry.captureException(e);
                next(e);
            });
        });
    }

    private copy() {
        this.app.post("/copy", passportAuthenticator, (req, res, next) => {
            (async () => {
                const verifiedBody = z
                    .object({
                        source: z.string(),
                        destination: z.string(),
                    })
                    .safeParse(req.body);

                if (!verifiedBody.success) {
                    res.status(400).send("Invalid request :" + verifiedBody.error.message);
                    return;
                }

                const { source, destination } = verifiedBody.data;

                if (source.includes("..") || destination.includes("..")) {
                    // Attempt to override filesystem. That' a hack!
                    res.status(400).send("Invalid directory");
                    return;
                }

                const virtualPath = mapPath(source, req);
                const newVirtualPath = mapPath(destination, req);

                if (await this.fileSystem.exist(newVirtualPath)) {
                    res.status(409).send("Destination already exist!");
                    return;
                }

                await this.fileSystem.copy(virtualPath, newVirtualPath);
                await this.mapListService.generateCacheFile(req.hostname);
                res.sendStatus(201);
            })().catch((e) => {
                console.error(`[${new Date().toISOString()}]`, e);
                Sentry.captureException(e);
                next(e);
            });
        });
    }

    private getMaps() {
        /**
         * @openapi
         * /maps:
         *   get:
         *     description: Returns the list of maps
         *     produces:
         *      - "application/json"
         *     responses:
         *      200:
         *         description: The details of the logged user
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 version:
         *                   type: string
         *                 maps:
         *                   type: object
         *                   properties:
         *                     mapUrl: string
         *                     metadata:
         *                       type: object
         *                       properties:
         *                         name: string
         *                         description: string
         *                         copyright: string
         *                         thumbnail: string
         *                     vendor:
         *                       type: object
         */
        this.app.get("/maps", (req, res, next) => {
            (async () => {
                try {
                    const parsedCacheFile = await this.mapListService.readCacheFile(req.hostname);
                    res.json(parsedCacheFile);
                    return;
                } catch (e) {
                    if (e instanceof FileNotFoundError || e instanceof ZodError) {
                        // No cache file or invalid cache file? What the hell? Let's try to regenerate the cache file
                        await this.mapListService.generateCacheFile(req.hostname);
                        // Now that the cache file is generated, let's retry serving the file.
                        const parsedCacheFile = await this.mapListService.readCacheFile(req.hostname);
                        res.json(parsedCacheFile);
                        return;
                    }
                    throw e;
                }
            })().catch((e) => {
                console.error(`[${new Date().toISOString()}]`, e);
                Sentry.captureException(e);
                next(e);
            });
        });
    }
}
