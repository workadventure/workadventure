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
import { analyticsPresenceTracker } from "./pusher/services/AnalyticsPresenceTracker";
import { analyticsTimedEventTracker } from "./pusher/services/AnalyticsTimedEventTracker";

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

// Graceful shutdown: close what is still open, then drain the analytics queues, so
// events buffered at exit time still reach the admin instead of being silently
// dropped.
//
// This matters more than it looks for timed events (conversations, and later areas
// and screenshares): an interval is reported by exactly ONE row, emitted when it
// closes. There is no periodic sample to fall back on, so an interval that is never
// closed is not merely imprecise — it never happened as far as analytics knows. Every
// exit path we can observe must therefore close first. The one we cannot is
// SIGKILL/OOM, where the process dies with the map; persisting it would not help,
// because on recovery we would know an interval was open but not when it ended, and
// inventing that timestamp is worse than losing it.
let shuttingDown = false;
const shutdown = (reason: string, endReason: "pusher_shutdown" | "pusher_crashed", exitCode: number): void => {
    if (shuttingDown) {
        return;
    }
    shuttingDown = true;

    // Close BEFORE draining, not after: both closeAll() calls only enqueue, so
    // draining first would leave their events behind.
    //
    // Timed events before connection sessions, deliberately: both read the clock as
    // they go, and the admin drops an interval whose end falls outside its session.
    // Same ordering as SocketManager.leaveRoom.
    const closedTimedEvents = analyticsTimedEventTracker.closeAll(endReason);
    const closedConnections = analyticsPresenceTracker.closeAll();
    console.info(
        `${reason}: closed ${closedTimedEvents} timed event(s) and ${closedConnections} connection(s), draining analytics queues before exit…`,
    );

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
            process.exit(exitCode);
        });
};

process.once("SIGTERM", (signal) => shutdown(`Received ${signal}`, "pusher_shutdown", 0));
process.once("SIGINT", (signal) => shutdown(`Received ${signal}`, "pusher_shutdown", 0));

// A crash used to take every open interval down with it: only SIGTERM/SIGINT were
// handled, so an uncaught throw exited without closing anything. The process is going
// to die either way — but it can still spend its last moments flushing what it
// already knows, which is the difference between a conversation being reported and
// never having existed.
process.once("uncaughtException", (error) => {
    console.error("Uncaught exception — closing open analytics intervals before exit", error);
    Sentry.captureException(error);
    shutdown("Uncaught exception", "pusher_crashed", 1);
});
process.once("unhandledRejection", (error) => {
    console.error("Unhandled rejection — closing open analytics intervals before exit", error);
    Sentry.captureException(error);
    shutdown("Unhandled rejection", "pusher_crashed", 1);
});

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
