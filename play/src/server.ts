import fs from "fs";
import process from "process";
import * as Sentry from "@sentry/node";
import { Server, ServerCredentials } from "@grpc/grpc-js";
import { RoomApiService } from "@workadventure/messages/src/ts-proto-generated/room-api";
import { setErrorHandler } from "@workadventure/shared-utils";
import app from "./pusher/app";
import {
    PUSHER_HTTP_PORT,
    ADMIN_API_URL,
    ROOM_API_BIND_HOST,
    ROOM_API_PORT,
    ROOM_API_SECRET_KEY,
    SENTRY_DSN,
    SENTRY_RELEASE,
    SENTRY_TRACES_SAMPLE_RATE,
    SENTRY_ENVIRONMENT,
    PUSHER_WS_PORT,
    ANALYTICS_DRAIN_TIMEOUT_MS,
    VIDEO_ANALYTICS_DRAIN_TIMEOUT_MS,
} from "./pusher/enums/EnvironmentVariable";
import RoomApiServer from "./room-api/RoomApiServer";
import { analyticsEventsQueue } from "./pusher/services/AnalyticsEventsQueue";
import { videoQualityAnalyticsQueue } from "./pusher/services/VideoQualityAnalyticsQueue";

// In production, the current working directory is "dist".
if (fs.existsSync("dist") && !fs.existsSync("src")) {
    process.chdir("dist");
}

// Sentry integration
if (SENTRY_DSN != undefined) {
    try {
        const sentryOptions: Sentry.NodeOptions = {
            dsn: SENTRY_DSN,
            release: SENTRY_RELEASE,
            environment: SENTRY_ENVIRONMENT,
            tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
            attachStacktrace: true,
        };

        Sentry.init(sentryOptions);

        setErrorHandler((error: Error) => {
            console.error(error);
            Sentry.captureException(error);
        });

        console.info("Sentry initialized");
    } catch (e) {
        console.error("Error while initializing Sentry", e);
    }
}

(async () => {
    await app.init();

    await Promise.race([
        app
            .listenWebServer(PUSHER_HTTP_PORT)
            .then(() => console.info(`WorkAdventure Pusher web-server started on port ${PUSHER_HTTP_PORT}!`)),
        app
            .listenWebSocket(PUSHER_WS_PORT)
            .then(() => console.info(`WorkAdventure Pusher web-socket server started on port ${PUSHER_WS_PORT}!`)),
        app.listenPrometheusPort(),
    ]);
})().catch((e) => {
    console.error(e);
    Sentry.captureException(e);
});

// Graceful shutdown: drain analytics queues before exit so events buffered at
// SIGTERM time still reach the admin instead of being silently dropped.
let shuttingDown = false;
const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) {
        return;
    }
    shuttingDown = true;
    console.info(`Received ${signal}, draining analytics queues before exit…`);
    const drains: [string, Promise<void>][] = [
        [
            "generic analytics",
            analyticsEventsQueue.drain(ANALYTICS_DRAIN_TIMEOUT_MS).finally(() => analyticsEventsQueue.stop()),
        ],
        [
            "video-quality analytics",
            videoQualityAnalyticsQueue
                .drain(VIDEO_ANALYTICS_DRAIN_TIMEOUT_MS)
                .finally(() => videoQualityAnalyticsQueue.stop()),
        ],
    ];
    (async () => {
        // allSettled never rejects, so each drain has to be inspected individually:
        // a rejected one would otherwise be dropped silently on the way out.
        const results = await Promise.allSettled(drains.map(([, drain]) => drain));
        results.forEach((result, index) => {
            if (result.status === "rejected") {
                console.error(`Error while draining the ${drains[index][0]} queue during shutdown`, result.reason);
            }
        });
    })()
        .catch((error) => {
            console.error("Error while draining analytics queues during shutdown", error);
        })
        .finally(() => {
            process.exit(0);
        });
};
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);

// Room API
if (!ADMIN_API_URL && !ROOM_API_SECRET_KEY) {
    console.info("RoomAPI is disabled! ROOM_API_SECRET_KEY is not defined on environment variables.");
} else {
    const RoomAPI = new Server();

    RoomAPI.addService(RoomApiService, RoomApiServer);

    RoomAPI.bindAsync(`${ROOM_API_BIND_HOST}:${ROOM_API_PORT}`, ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            throw err;
        }
        console.info(`RoomAPI starting on port ${ROOM_API_PORT}!`);
        RoomAPI.start();
    });
}
