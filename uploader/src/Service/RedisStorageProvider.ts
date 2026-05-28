import {createClient} from "redis";
import {REDIS_DB_NUMBER, REDIS_HOST, REDIS_PASSWORD, REDIS_PORT} from "../Enum/EnvironmentVariable";
import type {StorageProvider} from "./StorageProvider";
import type {TempStorageProvider} from "./TempStorageProvider";
import type {TargetDevice} from "./TargetDevice";

export class RedisStorageProvider implements StorageProvider, TempStorageProvider {
    private readonly redisClient;

    constructor() {
        const password = REDIS_PASSWORD ? `:${REDIS_PASSWORD}@` : ""
        this.redisClient = createClient({
            url: `redis://${password}${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB_NUMBER || 0}`,
        });
        this.redisClient.on('error', (err: unknown) => console.error('Redis Client Error', err));
        this.redisClient.connect().catch((err: unknown) => console.error('Redis Client Error', err));
    }

    static isEnabled(): boolean {
        return !!REDIS_HOST && !!REDIS_PORT
    }

    async upload(fileUuid: string, chunks: Buffer, mimeType: string | undefined): Promise<string> {
        await this.redisClient.set(fileUuid, chunks);
        return fileUuid;
    }

    uploadTempFile(audioMessageId: string, buffer: Buffer, expireSecond: number):Promise<unknown> {
        return Promise.all([
            this.redisClient.set(audioMessageId, buffer),
            this.redisClient.expire(audioMessageId, expireSecond)
        ]);
    }

    async deleteFileById(fileId: string): Promise<void> {
        await this.redisClient.del(fileId)
    }

    get(fileId: string):Promise<string | null> {
        return this.redisClient.get(fileId)
    }

    copyFile(fileId: string, target: TargetDevice): void {
        this.get(fileId).then((buffer: string | null)=> {
            target.copyFromBuffer(Buffer.from(buffer ?? ""))
        }).catch((err: unknown) => console.error("Could not copy file from Redis", err))
    }
}

export const redisStorageProvider = RedisStorageProvider.isEnabled()? new RedisStorageProvider(): null
