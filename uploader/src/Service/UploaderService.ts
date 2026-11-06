import {tempProviderService} from "./StorageProviderService";
import type {TempStorageProvider} from "./TempStorageProvider";

class UploaderService{
    constructor(private tempStorageProvider: TempStorageProvider){
    }

    uploadTempFile(audioMessageId: string, buffer: Buffer, expireSecond: number){
        return this.tempStorageProvider.uploadTempFile(audioMessageId, buffer, expireSecond)
    }

    getTemp(fileId: string){
        return this.tempStorageProvider.get(fileId);
    }
}

export const uploaderService = new UploaderService(tempProviderService);
