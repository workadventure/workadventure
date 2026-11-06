import type {TempStorageProvider} from "./TempStorageProvider";

export class NullStorageProvider implements TempStorageProvider {
    get(fileId: string): Promise<string | null> {
        throw new Error("Redis for temporary files is not defined");
    }

    uploadTempFile(audioMessageId: string, buffer: Buffer, expireSecond: number): Promise<unknown> {
        throw new Error("No providers setup for temporary storage");
    }
}
