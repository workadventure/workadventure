import { FileSystemInterface } from "./FileSystemInterface";
import AdmZip from "adm-zip";
import * as fs from "fs-extra";
import path from "path";
import { NextFunction, Response } from "express";
import { Archiver } from "archiver";

export class DiskFileSystem implements FileSystemInterface {
    public constructor(private baseDirectory: string) {}

    async deleteFiles(directory: string): Promise<void> {
        const fullPath = this.getFullPath(directory);
        if (await fs.pathExists(fullPath)) {
            await fs.emptyDir(fullPath);
        }
    }

    async writeFile(zipEntry: AdmZip.IZipEntry, targetFilePath: string, zip: AdmZip): Promise<void> {
        zip.extractEntryTo(zipEntry, path.dirname(this.getFullPath(targetFilePath)), false);
    }

    private getFullPath(filePath: string) {
        if (filePath.includes("..")) {
            throw new Error("Invalid path.");
        }
        return path.resolve(path.join(this.baseDirectory, filePath));
    }

    async serveStaticFile(virtualPath: string, res: Response, next: NextFunction): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const fullPath = this.getFullPath(virtualPath);
            if (await fs.pathExists(fullPath)) {
                res.sendFile(fullPath, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                next();
                resolve();
            }
        });
    }

    readFileAsString(virtualPath: string): Promise<string> {
        const fullPath = this.getFullPath(virtualPath);
        return fs.readFile(fullPath, {
            encoding: "utf-8",
        });
    }

    writeStringAsFile(virtualPath: string, content: string): Promise<void> {
        const fullPath = this.getFullPath(virtualPath);
        return fs.writeFile(fullPath, content, {
            encoding: "utf-8",
        });
    }

    archiveDirectory(archiver: Archiver, virtualPath: string): Promise<void> {
        const fullPath = this.getFullPath(virtualPath);
        archiver.directory(fullPath, false);
        return Promise.resolve();
    }
}
