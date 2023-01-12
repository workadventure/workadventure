import {
    DeleteObjectsCommand,
    GetObjectCommand,
    ListObjectsCommand,
    ListObjectsCommandInput,
    ListObjectsCommandOutput,
    PutObjectCommand,
    S3,
} from "@aws-sdk/client-s3";
import { FileSystemInterface } from "./FileSystemInterface";
import { s3UploadConcurrencyLimit } from "../Services/S3Client";
import mime from "mime";
import { NextFunction, Response } from "express";
import { IncomingMessage } from "http";
import { Archiver } from "archiver";
import { Readable } from "stream";
import { StreamZipAsync, ZipEntry } from "node-stream-zip";
import path from "path";

export class S3FileSystem implements FileSystemInterface {
    public constructor(private s3: S3, private bucketName: string) {}

    async deleteFiles(directory: string): Promise<void> {
        if (!directory.endsWith("/")) {
            directory += "/";
        }

        // Delete all files in the S3 bucket
        let listObjectsResponse: ListObjectsCommandOutput;
        let pageMarker: string | undefined;
        do {
            const command: ListObjectsCommandInput = {
                Bucket: this.bucketName,
                MaxKeys: 1000,
                Prefix: directory,
            };
            if (pageMarker) {
                command.Marker = pageMarker;
            }
            listObjectsResponse = await this.s3.send(new ListObjectsCommand(command));
            const objects = listObjectsResponse.Contents;

            if (objects && objects.length > 0) {
                await this.s3.send(
                    new DeleteObjectsCommand({
                        Bucket: this.bucketName,
                        Delete: { Objects: objects.map((o) => ({ Key: o.Key })) },
                    })
                );

                if (listObjectsResponse.IsTruncated) {
                    pageMarker = objects.slice(-1)[0].Key;
                }
            }
        } while (listObjectsResponse.IsTruncated);
    }

    async writeFile(zipEntry: ZipEntry, targetFilePath: string, zip: StreamZipAsync): Promise<void> {
        await s3UploadConcurrencyLimit(async () =>
            this.s3.send(
                new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: targetFilePath,
                    Body: (await zip.stream(zipEntry)) as unknown as ReadableStream,
                    ContentType: mime.getType(targetFilePath) ?? undefined,
                    ContentLength: zipEntry.size,
                })
            )
        );
        return;
    }

    async listFiles(virtualDirectory: string, extension?: string): Promise<string[]> {
        let listObjectsResponse: ListObjectsCommandOutput;
        let pageMarker: string | undefined;
        const allObjects = [];
        do {
            const command: ListObjectsCommandInput = {
                Bucket: this.bucketName,
                MaxKeys: 1000,
                Prefix: virtualDirectory,
            };
            if (pageMarker) {
                command.Marker = pageMarker;
            }
            listObjectsResponse = await this.s3.send(new ListObjectsCommand(command));
            const objects = listObjectsResponse.Contents;
            if (objects) {
                allObjects.push(...objects);
            }
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
        this.s3
            .getObject({ Bucket: this.bucketName, Key: virtualPath })
            .then((result) => {
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

                // Typescript doc is wrong in AWS: see: https://github.com/aws/aws-sdk-js-v3/issues/1877#issuecomment-755387549
                //eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-ignore
                (result.Body as IncomingMessage).pipe(res);
            })
            .catch((err) => {
                if (err instanceof Error && err.constructor.name === "NoSuchKey") {
                    next();
                } else {
                    next(err);
                }
            });
    }

    async readFileAsString(virtualPath: string): Promise<string> {
        const file = await this.s3.getObject({ Bucket: this.bucketName, Key: virtualPath });

        if (!file.Body) {
            throw new Error("Missing body");
        }

        return file.Body.transformToString("utf-8");
    }

    async writeStringAsFile(virtualPath: string, content: string): Promise<void> {
        await s3UploadConcurrencyLimit(() =>
            this.s3.send(
                new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: virtualPath,
                    Body: content,
                    ContentType: mime.getType(virtualPath) ?? undefined,
                })
            )
        );
        return;
    }

    async writeCache(virtualPath: string, fileName: string, content: string): Promise<void> {
        console.log(`${virtualPath}${fileName}`);
        await this.writeStringAsFile(`${virtualPath}${fileName}`, content);
        return;
    }

    async archiveDirectory(archiver: Archiver, virtualPath: string): Promise<void> {
        if (!virtualPath.endsWith("/")) {
            virtualPath += "/";
        }

        // Zip all files in the S3 bucket
        let listObjectsResponse: ListObjectsCommandOutput;
        let pageMarker: string | undefined;
        do {
            const command: ListObjectsCommandInput = {
                Bucket: this.bucketName,
                MaxKeys: 1000,
                Prefix: virtualPath,
            };
            if (pageMarker) {
                command.Marker = pageMarker;
            }
            listObjectsResponse = await this.s3.send(new ListObjectsCommand(command));
            const objects = listObjectsResponse.Contents;

            if (objects) {
                for (const file of objects) {
                    const { Body } = await this.s3.send(
                        new GetObjectCommand({
                            Bucket: this.bucketName,
                            Key: file.Key,
                        })
                    );
                    if (!file.Key || !Body) {
                        throw new Error("Failed to get file from S3");
                    }
                    if (file.Key.endsWith("/")) {
                        // a directory. Let's bypass this.
                        continue;
                    }
                    archiver.append(Body as Readable, { name: file.Key.substring(virtualPath.length) });
                }
                if (listObjectsResponse.IsTruncated) {
                    pageMarker = objects.slice(-1)[0].Key;
                }
            }
        } while (listObjectsResponse.IsTruncated);
    }
}
