import {v4} from "uuid";
import {Location, StorageProvider} from "./StorageProvider";
import {storageProviderService, tempProviderService} from "./StorageProviderService";
import {TempStorageProvider} from "./TempStorageProvider";

class UploaderService{
    constructor(private storageProvider: StorageProvider, private tempStorageProvider: TempStorageProvider){
    }

    async uploadFile(fileName: string, chunks: Buffer, mimeType?: string): Promise<Location>{
        const fileUuid = `${v4()}.${fileName.split('.').pop()}`;

        return this.storageProvider.upload(fileUuid, chunks, mimeType)
    }

    uploadTempFile(audioMessageId: string, buffer: Buffer, expireSecond: number){
        return this.tempStorageProvider.uploadTempFile(audioMessageId, buffer, expireSecond)
    }

    async deleteFileById(fileId: string){
        await this.storageProvider.deleteFileById(fileId)
    }

    get(fileId: string): Promise<Buffer|undefined|null>{
        return this.storageProvider.get(fileId)
    }

    getTemp(fileId: string){
        return this.tempStorageProvider.get(fileId);
    }

    getLink(fileId: string) {
        return this.storageProvider.getExternalDownloadLink(fileId)
    }
}

export const uploaderService = new UploaderService(storageProviderService, tempProviderService);
