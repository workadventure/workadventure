export interface TempStorageProvider {
    uploadTempFile(audioMessageId: string, buffer: Buffer, expireSecond: number) : Promise<unknown>;
    get(fileId: string):Promise<string | null>;
}
