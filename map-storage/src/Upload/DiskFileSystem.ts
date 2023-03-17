import path from "path";
import * as fs from "fs-extra";
import { NextFunction, Response } from "express";
import { Archiver } from "archiver";
import { StreamZipAsync, ZipEntry } from "node-stream-zip";
import { FileSystemInterface } from "./FileSystemInterface";
import { UploadController } from "./UploadController";
import { FileNotFoundError } from "./FileNotFoundError";
import { NodeError } from "./NodeError";

export class DiskFileSystem implements FileSystemInterface {
    public constructor(private baseDirectory: string) {}

    async deleteFiles(directory: string): Promise<void> {
        const fullPath = this.getFullPath(directory);
        if (await fs.pathExists(fullPath)) {
            await fs.emptyDir(fullPath);
        }
    }

    async exist(virtualPath: string): Promise<boolean> {
        const fullPath = this.getFullPath(virtualPath);
        return await fs.pathExists(fullPath);
    }

    async move(virtualPath: string, newVirtualPath: string): Promise<void> {
        const fullPath = this.getFullPath(virtualPath);
        const newFullPath = this.getFullPath(newVirtualPath);

        await fs.move(fullPath, newFullPath);
    }

    async copy(virtualPath: string, newVirtualPath: string): Promise<void> {
        const fullPath = this.getFullPath(virtualPath);
        const newFullPath = this.getFullPath(newVirtualPath);

        await fs.copy(fullPath, newFullPath, { recursive: true, errorOnExist: true });
    }

    async writeFile(zipEntry: ZipEntry, targetFilePath: string, zip: StreamZipAsync): Promise<void> {
        const fullPath = this.getFullPath(targetFilePath);
        const dir = path.dirname(fullPath);
        await fs.mkdirp(dir);
        await zip.extract(zipEntry, this.getFullPath(targetFilePath));
    }

    async listFiles(virtualDirectory: string, extension?: string): Promise<string[]> {
        const pathToDir = path.resolve(this.baseDirectory, virtualDirectory);
        const list = await this.getAllFilesWithin(pathToDir, pathToDir);
        if (!extension) {
            return list;
        }
        return list.filter((file) => path.extname(file) === extension);
    }

    private getFullPath(filePath: string) {
        if (filePath.includes("..")) {
            throw new Error("Invalid path.");
        }
        return path.resolve(path.join(this.baseDirectory, filePath));
    }

    serveStaticFile(virtualPath: string, res: Response, next: NextFunction): void {
        (async () => {
            const fullPath = this.getFullPath(virtualPath);
            if (await fs.pathExists(fullPath)) {
                res.sendFile(fullPath, (err) => {
                    if (err) {
                        next(err);
                    }
                });
            } else {
                next();
            }
        })().catch((e) => {
            next(e);
        });
    }

    async readFileAsString(virtualPath: string): Promise<string> {
        const fullPath = this.getFullPath(virtualPath);
        try {
            return await fs.readFile(fullPath, {
                encoding: "utf-8",
            });
        } catch (e) {
            const nodeError = NodeError.safeParse(e);
            if (e instanceof Error && nodeError.success && nodeError.data.code === "ENOENT") {
                throw new FileNotFoundError(e.message, {
                    cause: e,
                });
            }
            throw e;
        }
    }

    writeStringAsFile(virtualPath: string, content: string): Promise<void> {
        const fullPath = this.getFullPath(virtualPath);
        return fs.writeFile(fullPath, content, {
            encoding: "utf-8",
        });
    }

    archiveDirectory(archiver: Archiver, virtualPath: string): Promise<void> {
        const fullPath = this.getFullPath(virtualPath);
        archiver.glob("**/*", { cwd: fullPath, ignore: UploadController.CACHE_NAME });
        return Promise.resolve();
    }

    async getAllFilesWithin(dir: string, startingDir: string): Promise<string[]> {
        let results: string[] = [];
        const list = await fs.promises.readdir(dir);
        for (let file of list) {
            file = path.resolve(dir, file);
            const stat = await fs.promises.stat(file);
            if (stat && stat.isDirectory()) {
                /* Recurse into a subdirectory */
                results = results.concat(await this.getAllFilesWithin(file, startingDir));
            } else {
                /* Is a file */
                results.push(path.relative(startingDir, file));
            }
        }
        return results;
    }
}
