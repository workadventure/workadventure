import { Archiver } from "archiver";
import { NextFunction, Response } from "express";
import * as unzipper from "unzipper";
import { FileSystemInterface } from "../../Upload/FileSystemInterface";
import { GoogleDriveClient } from "./GoogleDriveClient";
import { Readable } from "stream";
import { FileNotFoundError } from "../../Upload/FileNotFoundError";

export class GoogleDriveFileSystem implements FileSystemInterface {
    private client: GoogleDriveClient;
    private rootFolderId: string;

    constructor(serviceAccountKey: string, rootFolderId: string) {
        this.client = new GoogleDriveClient(serviceAccountKey);
        this.rootFolderId = rootFolderId;
    }

    async writeFile(zipEntry: unzipper.File, targetFilePath: string): Promise<void> {
        const stream = zipEntry.stream();
        await this.client.uploadFile(targetFilePath, 'application/octet-stream', stream, this.rootFolderId);
    }

    async readFileAsString(virtualPath: string): Promise<string> {
        const files = await this.client.listFiles(this.rootFolderId);
        const file = files.find(f => f.name === virtualPath);
        if (!file || !file.id) {
            throw new FileNotFoundError(`File not found: ${virtualPath}`);
        }
        const stream = await this.client.getFile(file.id);
        return new Promise((resolve, reject) => {
            const chunks: any[] = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
            stream.on('error', reject);
        });
    }

    async deleteFiles(path: string): Promise<void> {
        const files = await this.client.listFiles(this.rootFolderId);
        const file = files.find(f => f.name === path);
        if (file && file.id) {
            await this.client.deleteFile(file.id);
        }
    }
    deleteFilesExceptWAM(directory: string, filesFromZip: string[]): Promise<void> {
        throw new Error("Method not implemented.");
    }
    async exist(virtualPath: string): Promise<boolean> {
        const files = await this.client.listFiles(this.rootFolderId);
        return files.some(f => f.name === virtualPath);
    }
    move(virtualPath: string, newVirtualPath: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    copy(virtualPath: string, newVirtualPath: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    serveStaticFile(virtualPath: string, res: Response<any, Record<string, any>>, next: NextFunction): void {
        throw new Error("Method not implemented.");
    }
    async listFiles(virtualDirectory: string, extension?: string | undefined): Promise<string[]> {
        const files = await this.client.listFiles(this.rootFolderId);
        let fileNames = files.map(f => f.name).filter((name): name is string => name !== null);

        if (extension) {
            fileNames = fileNames.filter(name => name.endsWith(extension));
        }
        return fileNames;
    }
    async writeStringAsFile(virtualPath: string, content: string): Promise<void> {
        const stream = new Readable();
        stream.push(content);
        stream.push(null);
        await this.client.uploadFile(virtualPath, 'text/plain', stream, this.rootFolderId);
    }
    archiveDirectory(archiver: Archiver, virtualPath: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    async writeByteArrayAsFile(virtualPath: string, content: Uint8Array): Promise<void> {
        const stream = new Readable();
        stream.push(content);
        stream.push(null);
        await this.client.uploadFile(virtualPath, 'application/octet-stream', stream, this.rootFolderId);
    }
}
