import {createClient} from "redis";
import {REDIS_DB_NUMBER, REDIS_HOST, REDIS_PASSWORD, REDIS_PORT} from "../Enum/EnvironmentVariable";
import type {TempStorageProvider} from "./TempStorageProvider";

export class RedisStorageProvider implements TempStorageProvider {
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

    uploadTempFile(audioMessageId: string, buffer: Buffer, expireSecond: number):Promise<unknown> {
        return Promise.all([
            this.redisClient.set(audioMessageId, buffer),
            this.redisClient.expire(audioMessageId, expireSecond)
        ]);
    }

    get(fileId: string):Promise<string | null> {
        return this.redisClient.get(fileId)
    }
}

export const redisStorageProvider = RedisStorageProvider.isEnabled()? new RedisStorageProvider(): null
