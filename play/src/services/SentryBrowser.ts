import { MonitoringInterface } from "./MonitoringInterface";
import * as Sentry from "@sentry/browser";
import { BrowserTracing } from "@sentry/tracing";

export class SentryBrowser implements MonitoringInterface {
    constructor() {
        Sentry.init({
            dsn: "https://67ddb05001e143f688e6e86636da5676@o4504674672246784.ingest.sentry.io/4504674673950720",
            // Set tracesSampleRate to 1.0 to capture 100%
            // of transactions for performance monitoring.
            // We recommend adjusting this value in production
            tracesSampleRate: 1.0,
            // This sets the sample rate to be 10%. You may want this to be 100% while
            // in development and sample at a lower rate in production
            replaysSessionSampleRate: 0.1,
            integrations: [new Sentry.Replay()],
        });
    }

    // Function to capture exception and send it to Sentry
    LogError(err: unknown) {
        Sentry.captureException(err);
    }
}
