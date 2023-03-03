import { MonitoringInterface } from "./MonitoringInterface";
import * as Sentry from "@sentry/node";
// Importing @sentry/tracing patches the global hub for tracing to work.
import "@sentry/tracing";

export class SentryBack implements MonitoringInterface {
    constructor() {
        // If you want to use `@sentry/tracing` in your project directly, use a named import instead:
        // import * as SentryTracing from "@sentry/tracing"
        // Unused named imports are not guaranteed to patch the global hub.
        Sentry.init({
            dsn: "https://7e392bef7f7341cda208de4767f44476@o4504674672246784.ingest.sentry.io/4504775104987136",
            // We recommend adjusting this value in production, or using tracesSampler
            // for finer control
            tracesSampleRate: 1.0,
        });
    }

    // Function to capture exception and send it to Sentry
    LogError(err: unknown) {
        Sentry.captureException(err);
    }
}
