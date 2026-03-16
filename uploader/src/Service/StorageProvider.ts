import {TargetDevice} from "./TargetDevice.ts";

export interface StorageProvider {

    upload(fileUuid: string, chunks: Buffer, mimeType: string | undefined): Promise<string>;

    deleteFileById(fileId: string): Promise<void>;

    copyFile(fileId: string, target: TargetDevice): void
}

export interface Location {
    Location: string;
    Key: string;
}
