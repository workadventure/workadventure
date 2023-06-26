import { createClient, RedisClientOptions } from "redis";
import * as Sentry from "@sentry/node";
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from "../Enum/EnvironmentVariable";

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
let pingInterval: NodeJS.Timeout | null = null;

if (redisClient) {
    redisClient.on("error", (err: unknown) => {
        console.error("Error connecting to Redis:", err);
        Sentry.captureException(`Error connecting to Redis: ${JSON.stringify(err)}`);
        if (pingInterval) {
            clearInterval(pingInterval);
        }
    });
    redisClient.on("connect", () => {
        console.log("Redis client is connected");
    });
    redisClient.on("reconnecting", () => console.log("Redis client is reconnecting"));
    redisClient.on("ready", () => console.log("Redis client is ready"));
}

export type RedisClient = NonNullable<typeof redisClient>;

export async function getRedisClient(): Promise<RedisClient | null> {
    if (redisClient === null) {
        return null;
    }

    if (!redisClient.isOpen) {
        await redisClient.connect().then(() => {
            pingInterval = setInterval(() => {
                redisClient.ping().catch((err) => {
                    console.error("Redis Ping Interval Error", err);
                    Sentry.captureException(`Redis Ping Interval Error: ${JSON.stringify(err)}`);
                });
            }, 1000 * 60 * 4);
        });
    }

    return redisClient;
}
