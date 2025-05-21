import path from "path";
import { Archiver } from "archiver";
import { NextFunction, Response } from "express";
import * as fs from "fs-extra";
import * as unzipper from "unzipper";
import { MapListService } from "../Services/MapListService";
import { FileNotFoundError } from "./FileNotFoundError";
import { FileSystemInterface } from "./FileSystemInterface";
import { NodeError } from "./NodeError";

export class DiskFileSystem implements FileSystemInterface {
    public constructor(private baseDirectory: string) {}

    async deleteFiles(path: string): Promise<void> {
        const fullPath = this.getFullPath(path);
        if (await fs.pathExists(fullPath)) {
            if (path === "/" || path === "" || path === "./") {
                // Special case: if root dir, empty the directory but don't try to remove it (we might not have the right to do so)
                await fs.emptyDir(fullPath);
            } else {
                await fs.rm(fullPath, { recursive: true, force: true });
            }
        }
    }

    async deleteFilesExceptWAM(directory: string, filesFromZip: string[]): Promise<void> {
        try {
            const fullPath = this.getFullPath(directory);
            if (await fs.pathExists(fullPath)) {
                const files = await this.getAllFilesWithin(fullPath, fullPath);
                const promises: Promise<void>[] = [];
                for (const file of files) {
                    if (file.includes(".wam")) {
                        const tmjKey = file.slice().replace(".wam", ".tmj");
                        // do not delete existing .wam file if there's no new version in zip and .tmj file with the same name exists
                        if (filesFromZip.includes(tmjKey) && !filesFromZip.includes(file)) {
                            continue;
                        }
                    }
                    promises.push(fs.promises.unlink(path.resolve(fullPath, file)));
                }
                await Promise.all(promises);
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}]`, error);
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

    async writeFile(zipEntry: unzipper.File, targetFilePath: string): Promise<void> {
        const fullPath = this.getFullPath(targetFilePath);
        const dir = path.dirname(fullPath);
        await fs.mkdirp(dir);

        const writeStream = fs.createWriteStream(fullPath, { flags: "w" });
        zipEntry.stream().pipe(writeStream);
        await new Promise((resolve, reject) => {
            writeStream.on("finish", resolve);
            writeStream.on("error", reject);
        });
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

    async writeStringAsFile(virtualPath: string, content: string): Promise<void> {
        const fullPath = this.getFullPath(virtualPath);
        const dir = path.dirname(fullPath);
        await fs.mkdirp(dir);
        return fs.writeFile(fullPath, content, {
            encoding: "utf-8",
        });
    }

    async writeByteArrayAsFile(virtualPath: string, content: Uint8Array): Promise<void> {
        const fullPath = this.getFullPath(virtualPath);
        const dir = path.dirname(fullPath);
        await fs.mkdirp(dir);
        return fs.writeFile(fullPath, Buffer.from(content), { encoding: "utf-8" });
    }

    archiveDirectory(archiver: Archiver, virtualPath: string): Promise<void> {
        const fullPath = this.getFullPath(virtualPath);
        archiver.glob("**/*", { cwd: fullPath, ignore: MapListService.CACHE_NAME });
        return Promise.resolve();
    }

    async getAllFilesWithin(dir: string, startingDir: string): Promise<string[]> {
        try {
            let results: string[] = [];
            const list = await fs.promises.readdir(dir);
            for (let file of list) {
                file = path.resolve(dir, file);
                // TODO: Optimize this by using a Promise.all
                // eslint-disable-next-line no-await-in-loop
                const stat = await fs.promises.stat(file);
                if (stat && stat.isDirectory()) {
                    /* Recurse into a subdirectory */
                    // TODO: Optimize this by using a Promise.all
                    // eslint-disable-next-line no-await-in-loop
                    results = results.concat(await this.getAllFilesWithin(file, startingDir));
                } else {
                    /* Is a file */
                    results.push(path.relative(startingDir, file));
                }
            }
            return results.map((path) => (path.indexOf("/") === 0 ? path.substring(1) : path));
        } catch (e) {
            const nodeError = NodeError.safeParse(e);
            if (e instanceof Error && nodeError.success && nodeError.data.code === "ENOENT") {
                return [];
            }
            throw e;
        }
    }
}
