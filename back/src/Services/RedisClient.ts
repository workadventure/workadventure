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
redisClient?.on("connect", () => console.log("Redis client is connected"));
redisClient?.on("reconnecting", () => console.log("Redis client is reconnecting"));
redisClient?.on("ready", () => console.log("Redis client is ready"));

const connexionPromise = redisClient?.connect();

export type RedisClient = NonNullable<typeof redisClient>;

export async function getRedisClient(): Promise<RedisClient | null> {
    if (redisClient === null) {
        return null;
    }

    await connexionPromise;

    return redisClient;
}
