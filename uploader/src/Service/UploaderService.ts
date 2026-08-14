import {v4} from "uuid";
import {mimeTypeManager} from "./MimeType";
import type { StorageProvider} from "./StorageProvider";
import {storageProviderService, tempProviderService} from "./StorageProviderService";
import type {TempStorageProvider} from "./TempStorageProvider";
import type {TargetDevice} from "./TargetDevice";

class UploaderService{
    constructor(private storageProvider: StorageProvider, private tempStorageProvider: TempStorageProvider){
    }

    async uploadFile(fileName: string, chunks: Buffer, mimeType?: string): Promise<string>{
        // The extension ends up in the storage key and in the download URL, and it is picked from
        // the name of the uploaded file, so it must be sanitized.
        const extension = mimeTypeManager.getExtensionByFileName(fileName);
        const fileUuid = extension ? `${v4()}.${extension}` : v4();

        return this.storageProvider.upload(fileUuid, chunks, mimeType)
    }

    uploadTempFile(audioMessageId: string, buffer: Buffer, expireSecond: number){
        return this.tempStorageProvider.uploadTempFile(audioMessageId, buffer, expireSecond)
    }

    async deleteFileById(fileId: string){
        await this.storageProvider.deleteFileById(fileId)
    }

    getTemp(fileId: string){
        return this.tempStorageProvider.get(fileId);
    }

    copyFile(fileId: string, target: TargetDevice) {
        this.storageProvider.copyFile(fileId, target)
    }
}

export const uploaderService = new UploaderService(storageProviderService, tempProviderService);
