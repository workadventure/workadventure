import { NextFunction, Response } from "express";
import { Archiver } from "archiver";
import { StreamZipAsync, ZipEntry } from "node-stream-zip";

export interface FileSystemInterface {
    deleteFiles(directory: string): Promise<void>;

    writeFile(zipEntry: ZipEntry, targetFilePath: string, zip: StreamZipAsync): Promise<void>;

    serveStaticFile(virtualPath: string, res: Response, next: NextFunction): void;

    readFileAsString(virtualPath: string): Promise<string>;

    listFiles(virtualDirectory: string, extension?: string): Promise<string[]>;

    writeStringAsFile(virtualPath: string, content: string): Promise<void>;

    writeCache(virtualPath: string, fileName: string, content: string): Promise<void>;

    archiveDirectory(archiver: Archiver, virtualPath: string): Promise<void>;
}
