// lib/server.ts
import * as Sentry from "@sentry/node";
import App from "./App";
import {
    ENABLE_TELEMETRY,
    SENTRY_DSN,
    SENTRY_RELEASE,
    SENTRY_ENVIRONMENT,
    SENTRY_TRACES_SAMPLE_RATE,
} from "./Enum/EnvironmentVariable";
import { telemetryService } from "./Services/TelemetryService";
import { analyticsEventsQueue } from "./Services/AnalyticsEventsQueue";
import { meetingAnalytics } from "./Services/MeetingAnalytics";
import { runDrains } from "./Services/ShutdownDrains";

if (ENABLE_TELEMETRY) {
    telemetryService.startTelemetry().catch((e) => console.error(e));
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
        console.info("Sentry initialized");
    } catch (e) {
        console.error("Error while initializing Sentry", e);
    }
}

analyticsEventsQueue.start();

/**
 * How long the process may spend flushing before it exits anyway. Under the grace
 * period a scheduler gives a terminating pod, so the flush finishes on its own terms
 * rather than being cut short by SIGKILL.
 */
const DRAIN_TIMEOUT_MS = 10_000;

/**
 * A meeting only exists once it has ended: there is no start row, the whole interval
 * rides on the closing one. So every reachable end has to be wired, and until now this
 * process had none at all — a deploy killed it with every live conversation inside it,
 * silently. The one gap left is SIGKILL/OOM, where the map dies with the process;
 * persisting it would not help, since on recovery we would know a meeting was open but
 * not when it ended, and inventing that timestamp is worse than losing it.
 */
let shuttingDown = false;
const shutdown = (reason: string, exitCode: number): void => {
    if (shuttingDown) {
        return;
    }
    shuttingDown = true;

    // Close BEFORE draining: closeAll only enqueues, so draining first would leave
    // everything it produced behind.
    const closed = meetingAnalytics.closeAll("back_shutdown");
    console.info(`${reason}: closed ${closed} meeting(s), draining the analytics queue before exit…`);

    runDrains(DRAIN_TIMEOUT_MS).then(
        () => process.exit(exitCode),
        (error: unknown) => {
            console.error("Unexpected error while draining during shutdown", error);
            process.exit(exitCode);
        },
    );
};

process.once("SIGTERM", (signal) => shutdown(`Received ${signal}`, 0));
process.once("SIGINT", (signal) => shutdown(`Received ${signal}`, 0));

// The process is going to die either way — but it can still spend its last moments
// flushing what it already knows, which is the difference between a conversation being
// reported and never having existed.
process.once("uncaughtException", (error) => {
    console.error("Uncaught exception — closing open meetings before exit", error);
    Sentry.captureException(error);
    shutdown("Uncaught exception", 1);
});

(async () => {
    await App.init();
    App.listen();
    App.grpcListen();
})().catch((e) => {
    console.error(e);
    Sentry.captureException(e);
});
