import * as fs from "fs";
import multer from "multer";
import { Express } from "express";
import { FileSystemInterface } from "./FileSystemInterface";
import { MAX_UNCOMPRESSED_SIZE } from "../Enum/EnvironmentVariable";
import { mapPath } from "../Services/PathMapper";
import { z } from "zod";
import path from "node:path";
import pLimit from "p-limit";
import { passportAuthenticator } from "../Services/Authentication";
import archiver from "archiver";
import { fileSystem } from "../fileSystem";
import StreamZip from "node-stream-zip";
import { MapValidator, ValidationError } from "@workadventure/map-editor/src/GameMap/MapValidator";

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

    private uploadLimiter: Map<string, pLimit.Limit>;

    constructor(private app: Express, private fileSystem: FileSystemInterface) {
        this.uploadLimiter = new Map<string, pLimit.Limit>();
        this.index();
        this.postUpload();
        this.getDownload();
    }

    private index() {
        this.app.get("/", passportAuthenticator, (req, res) => {
            res.sendFile(__dirname + "/index.html");
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

                const directory = Body.parse(req.body).directory || "./";

                if (directory.includes("..")) {
                    // Attempt to override filesystem. That' a hack!
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
                    const zip = new StreamZip.async({ file: zipFile.path });
                    const zipEntries = Object.values(await zip.entries()).filter(
                        (zipEntry) => !zipEntry.isDirectory && this.filterFile(zipEntry.name)
                    );

                    let totalSize = 0;
                    for (const zipEntry of zipEntries) {
                        totalSize += zipEntry.size;
                    }

                    if (totalSize > MAX_UNCOMPRESSED_SIZE) {
                        res.status(413).send(
                            `File too large. Unzipped files should be less than ${MAX_UNCOMPRESSED_SIZE} bytes.`
                        );
                        return;
                    }

                    // Let's validate the archive
                    const mapValidator = new MapValidator("error");
                    const availableFiles = zipEntries.map((entry) => entry.name);

                    const errors: { [key: string]: ValidationError[] } = {};

                    for (const zipEntry of zipEntries) {
                        const extension = path.extname(zipEntry.name);
                        if (
                            extension === ".json" &&
                            mapValidator.doesStringLooksLikeMap((await zip.entryData(zipEntry)).toString())
                        ) {
                            // We forbid Maps in JSON format.
                            errors[zipEntry.name] = [
                                {
                                    type: "error",
                                    message: 'Invalid file extension. Maps should end with the ".tmj" extension.',
                                    details: "",
                                },
                            ];

                            continue;
                        }

                        if (extension !== ".tmj") {
                            continue;
                        }

                        const result = mapValidator.validateStringMap(
                            (await zip.entryData(zipEntry)).toString(),
                            zipEntry.name,
                            availableFiles
                        );
                        if (!result.ok) {
                            errors[zipEntry.name] = result.error;
                        }
                    }

                    if (Object.keys(errors).length > 0) {
                        res.status(400).json(errors);
                        return;
                    }

                    // Delete all files in the S3 bucket
                    await this.fileSystem.deleteFiles(mapPath(directory, req));

                    const promises: Promise<void>[] = [];
                    // Iterate over the entries in the ZIP archive
                    for (const zipEntry of zipEntries) {
                        // Store the file
                        promises.push(
                            this.fileSystem.writeFile(zipEntry, mapPath(path.join(directory, zipEntry.name), req), zip)
                        );
                    }

                    await Promise.all(promises);

                    await zip.close();
                    // Delete the uploaded ZIP file from the disk
                    fs.unlink(zipFile.path, (err) => {
                        if (err) {
                            console.error("Error deleting file:", err);
                        }
                    });

                    const cacheFileName = "cache.txt";
                    const files = await fileSystem.listFiles(mapPath("/", req), ".tmj");

                    await fileSystem.writeStringAsFile(mapPath("/" + cacheFileName, req), JSON.stringify(files));

                    res.send("File successfully uploaded.");
                });

                if (limiter.activeCount === 0 && limiter.pendingCount === 0) {
                    this.uploadLimiter.delete(virtualDirectory);
                }
            })().catch((e) => next(e));
        });
    }

    /**
     * Let's filter out any file starting with "."
     */
    public filterFile(path: string): boolean {
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
                        console.warn("File not found: ", err);
                    } else {
                        console.error("A warning occurred while Zipping file: ", err);
                    }
                });

                // good practice to catch this error explicitly
                archive.on("error", function (err) {
                    console.error("An error occurred while Zipping file: ", err);
                    res.status(500).send("An error occurred");
                });

                // pipe archive data to the file
                archive.pipe(res);

                await fileSystem.archiveDirectory(archive, virtualDirectory);

                await archive.finalize();
            })().catch((e) => next(e));
        });
    }
}
