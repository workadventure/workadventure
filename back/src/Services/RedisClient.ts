import { ClientOpts, createClient, RedisClient } from "redis";
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from "../Enum/EnvironmentVariable";

let redisClient: RedisClient | null = null;

// FIXME: configure timeouts and retries
// FIXME: configure timeouts and retries
// FIXME: configure timeouts and retries
// FIXME: configure timeouts and retries
// FIXME: configure timeouts and retries
// FIXME: configure timeouts and retries

if (REDIS_HOST !== undefined) {
    const config: ClientOpts = {
        host: REDIS_HOST,
        port: REDIS_PORT,
    };

    if (REDIS_PASSWORD) {
        config.password = REDIS_PASSWORD;
    }

    redisClient = createClient(config);

    // Enable keyspace events to listen to changes in player variables.
    // Listen to:
    // - E: Keyevent events
    // - h: Hash commands
    // - x: Expired events (events generated every time a key expires)
    redisClient.config("SET", "notify-keyspace-events", "Ehx", (e, result) => {
        if (e) {
            console.error("An error occurred while configuring Redis: ", e);
        }
    });

    redisClient.on("error", (err) => {
        console.error("Error connecting to Redis:", err);
    });
}

export { redisClient };
