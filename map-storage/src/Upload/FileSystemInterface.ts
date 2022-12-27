import AdmZip, { IZipEntry } from "adm-zip";
import { NextFunction, Response } from "express";
import { Archiver } from "archiver";

export interface FileSystemInterface {
    deleteFiles(directory: string): Promise<void>;

    writeFile(zipEntry: IZipEntry, targetFilePath: string, zip: AdmZip): Promise<void>;

    serveStaticFile(virtualPath: string, res: Response, next: NextFunction): void | Promise<void>;

    readFileAsString(virtualPath: string): Promise<string>;

    writeStringAsFile(virtualPath: string, content: string): Promise<void>;

    archiveDirectory(archiver: Archiver, virtualPath: string): Promise<void>;
}
