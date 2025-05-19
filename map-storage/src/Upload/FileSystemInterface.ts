import { Archiver } from "archiver";
import { NextFunction, Response } from "express";
import * as unzipper from "unzipper";

export interface FileSystemInterface {
    deleteFiles(path: string): Promise<void>;

    deleteFilesExceptWAM(directory: string, filesFromZip: string[]): Promise<void>;

    writeFile(zipEntry: unzipper.File, targetFilePath: string): Promise<void>;

    exist(virtualPath: string): Promise<boolean>;

    move(virtualPath: string, newVirtualPath: string): Promise<void>;

    copy(virtualPath: string, newVirtualPath: string): Promise<void>;

    serveStaticFile(virtualPath: string, res: Response, next: NextFunction): void;

    readFileAsString(virtualPath: string): Promise<string>;

    listFiles(virtualDirectory: string, extension?: string): Promise<string[]>;

    writeStringAsFile(virtualPath: string, content: string): Promise<void>;

    archiveDirectory(archiver: Archiver, virtualPath: string): Promise<void>;

    writeByteArrayAsFile(virtualPath: string, content: Uint8Array): Promise<void>;
}
