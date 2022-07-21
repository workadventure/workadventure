import { createClient } from "redis";
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from "../Enum/EnvironmentVariable";
import { RedisClientOptions } from "@redis/client";

const config: RedisClientOptions = {
    socket: {
        host: REDIS_HOST,
        port: REDIS_PORT,
    },
};

if (REDIS_PASSWORD) {
    config.password = REDIS_PASSWORD;
}

const redisClient = REDIS_HOST !== undefined ? createClient(config) : null;

redisClient?.on("error", (err: unknown) => {
    console.error("Error connecting to Redis:", err);
});

const connexionPromise = redisClient?.connect();

export type RedisClient = NonNullable<typeof redisClient>;

export async function getRedisClient(): Promise<RedisClient | null> {
    if (redisClient === null) {
        return null;
    }

    await connexionPromise;

    return redisClient;
}
