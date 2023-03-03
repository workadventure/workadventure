import { MonitoringInterface } from "./MonitoringInterface";
import * as Sentry from "@sentry/browser";
import { BrowserTracing } from "@sentry/tracing";

export class SentryBrowser implements MonitoringInterface {
    constructor() {
        Sentry.init({
            dsn: "https://67ddb05001e143f688e6e86636da5676@o4504674672246784.ingest.sentry.io/4504674673950720",
            integrations: [new BrowserTracing()],

            // Set tracesSampleRate to 1.0 to capture 100%
            // of transactions for performance monitoring.
            // We recommend adjusting this value in production
            tracesSampleRate: 1.0,
        });
    }

    // Function to capture exception and send it to Sentry
    LogError(err: unknown) {
        Sentry.captureException(err);
    }
}
