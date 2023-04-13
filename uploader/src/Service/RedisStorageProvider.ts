import {commandOptions, createClient} from "redis";
import {REDIS_DB_NUMBER, REDIS_HOST, REDIS_PASSWORD, REDIS_PORT} from "../Enum/EnvironmentVariable";
import {StorageProvider} from "./StorageProvider";
import {TempStorageProvider} from "./TempStorageProvider";
import {TargetDevice} from "./TargetDevice";

export class RedisStorageProvider implements StorageProvider, TempStorageProvider {
    private redisClient;

    constructor() {
        const password = REDIS_PASSWORD ? `:${REDIS_PASSWORD}@` : ""
        this.redisClient = createClient({
            url: `redis://${password}${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB_NUMBER || 0}`,
        });
        this.redisClient.on('error', (err: unknown) => console.error('Redis Client Error', err));
        this.redisClient.connect();
    }

    static isEnabled(): boolean {
        return !!REDIS_HOST && !!REDIS_PORT
    }

    async upload(fileUuid: string, chunks: Buffer, mimeType: string | undefined): Promise<string> {
        await this.redisClient.set(fileUuid, chunks);
        return new Promise((solve, rej) => {
            solve(fileUuid);
        });
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

    get(fileId: string):Promise<Buffer|undefined|null> {
        return this.redisClient.get(commandOptions({ returnBuffers: true }), fileId)
    }

    copyFile(fileId: string, target: TargetDevice): void {
        this.get(fileId).then((buffer: Buffer | undefined | null)=> {
            target.copyFromBuffer(buffer)
        })
    }
}

export const redisStorageProvider = RedisStorageProvider.isEnabled()? new RedisStorageProvider(): null
