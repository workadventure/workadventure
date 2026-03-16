import {v4} from "uuid";
import {Location, StorageProvider} from "./StorageProvider.ts";
import {storageProviderService, tempProviderService} from "./StorageProviderService.ts";
import {TempStorageProvider} from "./TempStorageProvider.ts";
import {TargetDevice} from "./TargetDevice.ts";

class UploaderService{
    constructor(private storageProvider: StorageProvider, private tempStorageProvider: TempStorageProvider){
    }

    uploadFile(fileName: string, chunks: Buffer, mimeType?: string): Promise<string>{
        const fileUuid = `${v4()}.${fileName.split('.').pop()}`;

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
