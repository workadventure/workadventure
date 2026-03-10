/* eslint-disable listeners/no-inline-function-event-listener, listeners/no-missing-remove-event-listener */
import type { RedisClientOptions } from "redis";
import { createClient } from "redis";
import * as Sentry from "@sentry/node";

import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from "../enums/EnvironmentVariable";

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
let connectPromise: Promise<void> | null = null;

if (redisClient) {
    redisClient.on("error", (err: unknown) => {
        console.error("Error connecting to Redis:", err);
        Sentry.captureException(err);
        if (pingInterval) {
            clearInterval(pingInterval);
        }
    });
    redisClient.on("connect", () => {
        console.info("Redis client is connected");
    });
    redisClient.on("reconnecting", () => console.info("Redis client is reconnecting"));
    redisClient.on("ready", () => console.info("Redis client is ready"));
}

export type RedisClient = NonNullable<typeof redisClient>;

export async function getRedisClient(): Promise<RedisClient | null> {
    if (redisClient === null) {
        return null;
    }

    if (!redisClient.isOpen && connectPromise === null) {
        connectPromise = redisClient
            .connect()
            .then(() => {
                if (pingInterval === null) {
                    pingInterval = setInterval(() => {
                        redisClient.ping().catch((err) => {
                            console.error("Redis Ping Interval Error", err);
                            Sentry.captureException(err);
                        });
                    }, 1000 * 60 * 4);
                }
            })
            .finally(() => {
                connectPromise = null;
            });
    }

    if (!redisClient.isOpen && connectPromise !== null) {
        await connectPromise;
    }

    return redisClient;
}
