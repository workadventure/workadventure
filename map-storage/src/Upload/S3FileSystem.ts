import type { IncomingMessage } from "http";
import path from "path";
import { pipeline, type Readable } from "stream";
import type { ListObjectsV2CommandInput, ListObjectsV2CommandOutput, S3 } from "@aws-sdk/client-s3";
import {
    CopyObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    NoSuchKey,
    PutObjectCommand,
} from "@aws-sdk/client-s3";
import type { NextFunction, Response } from "express";
import mime from "mime";
import type * as unzipper from "unzipper";
import pLimit from "p-limit";
import type ZipStream from "zip-stream";
import { MapListService } from "../Services/MapListService";
import { s3UploadConcurrencyLimit } from "../Services/S3Client";
import { FileNotFoundError } from "./FileNotFoundError";
import type { FileSystemInterface } from "./FileSystemInterface";

/* eslint-disable no-await-in-loop */

/**
 * Passed as the `AbortController` reason when we cancel an in-flight S3 read because the client
 * disconnected. The AWS SDK rejects the request with a generic `AbortError` but carries this exact
 * instance as its `cause`, so we can positively identify *our* abort (via `instanceof` on `.cause`)
 * instead of string-matching the SDK's error name.
 */
export class ClientDisconnectedError extends Error {
    constructor() {
        super("The client disconnected before the S3 object finished serving");
        this.name = "ClientDisconnectedError";
    }
}

function isClientDisconnectedAbort(err: unknown): boolean {
    return err instanceof Error && err.cause instanceof ClientDisconnectedError;
}

export class S3FileSystem implements FileSystemInterface {
    public constructor(
        private s3: S3,
        private bucketName: string,
    ) {}

    async deleteFiles(path: string): Promise<void> {
        if (!path.endsWith("/")) {
            // The path might be a single file
            if (await this.isFile(path)) {
                await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: path }));
                return;
            }
        }

        let directory = path;

        if (!directory.endsWith("/")) {
            directory += "/";
        }

        // Delete all files in the S3 bucket
        let listObjectsResponse: ListObjectsV2CommandOutput;
        let continuationToken: string | undefined;
        do {
            const command: ListObjectsV2CommandInput = {
                Bucket: this.bucketName,
                MaxKeys: 1000,
                Prefix: directory,
                ContinuationToken: continuationToken,
            };

            listObjectsResponse = await this.s3.send(new ListObjectsV2Command(command));
            const objects = listObjectsResponse.Contents;

            if (objects && objects.length > 0) {
                await this.s3.send(
                    new DeleteObjectsCommand({
                        Bucket: this.bucketName,
                        Delete: { Objects: objects.map((o) => ({ Key: o.Key })) },
                    }),
                );
            }
            continuationToken = listObjectsResponse.NextContinuationToken;
        } while (listObjectsResponse.IsTruncated);
    }

    private async isFile(path: string): Promise<boolean> {
        try {
            await this.s3.send(new HeadObjectCommand({ Bucket: this.bucketName, Key: path }));
            return true;
        } catch (e) {
            if (e instanceof NoSuchKey) {
                return false;
            }
            throw e;
        }
    }

    async deleteFilesExceptWAM(directory: string, filesFromZip: string[]): Promise<void> {
        if (!directory.endsWith("/")) {
            directory += "/";
        }

        // Delete all files in the S3 bucket
        let listObjectsResponse: ListObjectsV2CommandOutput;
        let continuationToken: string | undefined;
        do {
            const command: ListObjectsV2CommandInput = {
                Bucket: this.bucketName,
                MaxKeys: 1000,
                Prefix: directory,
                ContinuationToken: continuationToken,
            };
            listObjectsResponse = await this.s3.send(new ListObjectsV2Command(command));
            const objects = listObjectsResponse.Contents;

            if (objects && objects.length > 0) {
                const filteredObjects = objects.filter((o) => {
                    if (o.Key?.includes(".wam")) {
                        const wamKey = o.Key?.slice().replace(directory, "");
                        const tmjKey = wamKey.slice().replace(".wam", ".tmj");
                        // do not delete existing .wam file if there's no new version in zip and .tmj file with the same name exists
                        if (filesFromZip.includes(tmjKey) && !filesFromZip.includes(wamKey)) {
                            return false;
                        }
                    }
                    return true;
                });
                if (filteredObjects.length > 0) {
                    await this.s3.send(
                        new DeleteObjectsCommand({
                            Bucket: this.bucketName,
                            Delete: {
                                Objects: filteredObjects.map((o) => ({ Key: o.Key })),
                            },
                        }),
                    );
                }
            }
            continuationToken = listObjectsResponse.NextContinuationToken;
        } while (listObjectsResponse.IsTruncated);
    }

    async exist(virtualPath: string): Promise<boolean> {
        return (await this.listFiles(virtualPath)).length > 0;
    }

    async move(virtualPath: string, newVirtualPath: string): Promise<void> {
        return await this.moveInternal(virtualPath, newVirtualPath, true);
    }

    async copy(virtualPath: string, newVirtualPath: string): Promise<void> {
        return await this.moveInternal(virtualPath, newVirtualPath);
    }

    private async moveInternal(virtualPath: string, newVirtualPath: string, deletePrevious = false) {
        let isTruncated = true;
        let continuationToken: string | undefined = undefined;
        let result;
        while (isTruncated) {
            result = await this.s3.send(
                new ListObjectsV2Command({
                    Bucket: this.bucketName,
                    Prefix: virtualPath,
                    ContinuationToken: continuationToken,
                }),
            );

            // Get the list of objects from the result
            const objects = result.Contents;

            const limit = pLimit(30);

            // Use Promise.all to run the copy and delete operations in parallel
            if (objects) {
                const requests = objects.map(async (object) => {
                    const objectKey = object.Key;

                    if (!objectKey) {
                        throw new Error("No key on object : " + JSON.stringify(object));
                    }

                    const targetObjectKey = objectKey.replace(virtualPath, newVirtualPath);
                    await limit(async () => {
                        await this.s3.send(
                            new CopyObjectCommand({
                                Bucket: this.bucketName,
                                CopySource: `${this.bucketName}/${objectKey}`,
                                Key: targetObjectKey,
                            }),
                        );
                        if (deletePrevious) {
                            await this.s3.send(
                                new DeleteObjectCommand({
                                    Bucket: this.bucketName,
                                    Key: objectKey,
                                }),
                            );
                        }
                    });
                });

                await Promise.all(requests);
            }

            // Check if there are more objects to list
            isTruncated = result.IsTruncated ?? false;
            continuationToken = result.NextContinuationToken;
        }
    }

    async writeFile(zipEntry: unzipper.File, targetFilePath: string): Promise<void> {
        await s3UploadConcurrencyLimit(async () => {
            await this.s3.send(
                new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: targetFilePath,
                    Body: await zipEntry.buffer(),
                    // TODO: the stream() + contentLength would be optimal, but it seems to fail with some S3-compatible providers
                    //Body: zipEntry.stream(),
                    ContentType: mime.getType(targetFilePath) ?? undefined,
                    //ContentLength: zipEntry.uncompressedSize,
                }),
            );
        });
        return;
    }

    async listFiles(virtualDirectory: string, extension?: string): Promise<string[]> {
        let listObjectsResponse: ListObjectsV2CommandOutput;
        let continuationToken: string | undefined;
        const allObjects = [];
        do {
            const command: ListObjectsV2CommandInput = {
                Bucket: this.bucketName,
                MaxKeys: 1000,
                Prefix: virtualDirectory,
                ContinuationToken: continuationToken,
            };
            listObjectsResponse = await this.s3.send(new ListObjectsV2Command(command));
            const objects = listObjectsResponse.Contents;
            if (objects) {
                allObjects.push(...objects);
            }
            continuationToken = listObjectsResponse.NextContinuationToken;
        } while (listObjectsResponse.IsTruncated);

        const recordsPaths: string[] = allObjects.map((record) => record.Key ?? "") ?? [];
        if (extension) {
            return recordsPaths
                .filter((record) => path.extname(record) === extension)
                .map((record) => path.relative(virtualDirectory, record));
        }
        return recordsPaths.map((record) => path.relative(virtualDirectory, record));
    }

    serveStaticFile(virtualPath: string, res: Response, next: NextFunction): void {
        // The client may already be gone; nothing to serve, and nothing to release yet.
        if (res.destroyed) {
            return;
        }

        // When the client disconnects we must release the S3 request's socket back to the pool.
        // Destroying the (undrained) response body does NOT do that — it leaks the socket, which is
        // how the connection pool gets permanently wedged (see aws-sdk-js-v3#6691). Aborting the
        // request via an AbortController does release it. We pass a ClientDisconnectedError as the
        // abort reason so the resulting rejection is unambiguously ours (see the catch below).
        const controller = new AbortController();
        const onClose = () => {
            if (!res.writableFinished) {
                controller.abort(new ClientDisconnectedError());
            }
        };
        // `stream.pipeline` below already registers several "close" listeners on the response, and the
        // Express/Sentry stack adds more, leaving a served file right at Node's default limit of 10.
        // Our disconnect listener is one more on top, which would trip a (harmless but noisy)
        // MaxListenersExceededWarning. The set is bounded and removed in `finally`, so account for our
        // one extra listener instead of masking leaks with an unlimited (0) budget.
        res.setMaxListeners(res.getMaxListeners() + 1);
        res.on("close", onClose);

        this.s3
            .getObject({ Bucket: this.bucketName, Key: virtualPath }, { abortSignal: controller.signal })
            .then((result) => {
                if (res.destroyed) {
                    controller.abort(new ClientDisconnectedError());
                    return;
                }

                // Set the content type and content length headers
                res.set("Content-Type", result.ContentType);

                if (result.ContentLength) {
                    res.set("Content-Length", result.ContentLength.toString());
                }

                if (result.ETag) {
                    res.set("ETag", result.ETag);
                }

                if (result.Expires) {
                    res.set("Expires", result.Expires.toString());
                }

                // TODO assess this idea: REDIRECT TO THE BUCKET PUBLIC URL FOR MOST FILES EXCEPT .html files

                if (!result.Body) {
                    throw new Error("Missing body");
                }

                // Keep this promise pending until the response is fully streamed (or torn down), so
                // the "close" listener stays attached for the whole download and can abort a
                // mid-stream disconnect.
                return new Promise<void>((resolve) => {
                    // Typescript doc is wrong in AWS: see: https://github.com/aws/aws-sdk-js-v3/issues/1877#issuecomment-755387549
                    //eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    //@ts-ignore
                    pipeline(result.Body as IncomingMessage, res, (error) => {
                        // On client disconnect the response is destroyed and the abort above releases
                        // the socket; pipeline surfaces that as an (expected) error we must not forward.
                        if (error && !res.destroyed) {
                            next(error);
                        }
                        resolve();
                    });
                });
            })
            .catch((err) => {
                if (isClientDisconnectedAbort(err)) {
                    // The client went away before/while we were fetching; the request was aborted and
                    // its socket released. Nothing to respond to.
                    return;
                }
                if (err instanceof Error && err.constructor.name === "NoSuchKey") {
                    next();
                } else {
                    next(err);
                }
            })
            .finally(() => {
                res.removeListener("close", onClose);
            });
    }

    async readFileAsString(virtualPath: string): Promise<string> {
        try {
            const file = await this.s3.getObject({ Bucket: this.bucketName, Key: virtualPath });

            if (!file.Body) {
                throw new Error("Missing body");
            }

            return await file.Body.transformToString("utf-8");
        } catch (e) {
            if (e instanceof NoSuchKey) {
                throw new FileNotFoundError(e.message, {
                    cause: e,
                });
            }
            throw e;
        }
    }

    async writeStringAsFile(virtualPath: string, content: string): Promise<void> {
        await s3UploadConcurrencyLimit(() =>
            this.s3.send(
                new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: virtualPath,
                    Body: content,
                    ContentType: mime.getType(virtualPath) ?? undefined,
                }),
            ),
        );
        return;
    }

    async writeByteArrayAsFile(virtualPath: string, content: Uint8Array): Promise<void> {
        await s3UploadConcurrencyLimit(() =>
            this.s3.send(
                new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: virtualPath,
                    Body: Buffer.from(content),
                    ContentType: mime.getType(virtualPath) ?? undefined,
                }),
            ),
        );
        return;
    }

    async archiveDirectory(archive: ZipStream, virtualPath: string): Promise<void> {
        if (!virtualPath.endsWith("/")) {
            virtualPath += "/";
        }

        // Zip all files in the S3 bucket
        let listObjectsResponse: ListObjectsV2CommandOutput;
        let continuationToken: string | undefined;
        do {
            const command: ListObjectsV2CommandInput = {
                Bucket: this.bucketName,
                MaxKeys: 1000,
                Prefix: virtualPath,
                ContinuationToken: continuationToken,
            };
            listObjectsResponse = await this.s3.send(new ListObjectsV2Command(command));
            const objects = listObjectsResponse.Contents;

            if (objects) {
                for (const file of objects) {
                    const key = file.Key;

                    if (!key) {
                        throw new Error("Failed to get file from S3");
                    }
                    if (key.endsWith("/") || key.includes(MapListService.CACHE_NAME)) {
                        continue;
                    }

                    // The archive is piped to the HTTP response. When the client disconnects
                    // the archive is destroyed. Stop here instead of opening another S3
                    // GetObject stream that would never be consumed, leaking its socket from
                    // the S3 connection pool.
                    if (archive.destroyed) {
                        return;
                    }

                    // Returns true when the archive was torn down mid-entry, so we stop the loop.
                    const tornDown = await this.archiveEntry(archive, key, virtualPath);
                    if (tornDown) {
                        return;
                    }
                }
            }
            continuationToken = listObjectsResponse.NextContinuationToken;
        } while (listObjectsResponse.IsTruncated);
    }

    /**
     * Fetches a single S3 object and writes it into the archive. Resolves to `true` when the archive
     * was torn down (e.g. the client disconnected) so the caller stops the loop, `false` once the
     * entry has been written, and rejects on a genuine archiving error.
     *
     * On the happy path `archive.entry()` fully drains the body, returning its socket to the pool. On
     * teardown/error the body is NOT drained, so we abort the S3 request via an AbortController —
     * destroying the undrained body would leak the socket and eventually wedge the pool (see
     * aws-sdk-js-v3#6691).
     */
    private async archiveEntry(archive: ZipStream, key: string, virtualPath: string): Promise<boolean> {
        const controller = new AbortController();
        const { Body } = await this.s3.send(
            new GetObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            }),
            { abortSignal: controller.signal },
        );
        if (!Body) {
            throw new Error("Failed to get file from S3");
        }
        const body = Body as Readable;
        // Aborting makes the body emit an error; swallow it (zip-stream does not attach an error
        // handler to the source), so an abort cannot crash the process with an unhandled 'error'.
        body.on("error", () => {
            /* released via abort / teardown */
        });

        // The client may have disconnected while the object was being fetched.
        if (archive.destroyed) {
            controller.abort();
            return true;
        }

        return new Promise<boolean>((resolve, reject) => {
            // archive.entry()'s callback may never fire if the archive is torn down
            // while this entry is being written. Watch the archive so we always settle
            // and release the S3 body's socket:
            //  - "close": teardown (archive.destroy(), e.g. the client disconnected) —
            //    stop cleanly; returning true ends the loop.
            //  - "error": a real archiving error — propagate it (do not swallow).
            const onClose = () => {
                controller.abort();
                resolve(true);
            };
            const onError = (err: Error) => {
                controller.abort();
                reject(err);
            };
            archive.once("close", onClose);
            archive.once("error", onError);

            archive.entry(body, { name: key.substring(virtualPath.length) }, (err) => {
                archive.removeListener("close", onClose);
                archive.removeListener("error", onError);
                if (err) {
                    controller.abort();
                    reject(err);
                    return;
                }
                resolve(false);
            });
        });
    }
}
