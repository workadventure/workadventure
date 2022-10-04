import {TargetDevice} from "./TargetDevice";

export interface StorageProvider {

    upload(fileUuid: string, chunks: Buffer, mimeType: string | undefined): Promise<Location>;

    deleteFileById(fileId: string): Promise<void>;

    copyFile(fileId: string, target: TargetDevice): void
}

export interface Location {
    Location: string;
    Key: string;
}
