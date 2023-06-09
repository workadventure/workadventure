import "../style/index.scss";

import * as Sentry from "@sentry/browser";
import { SENTRY_DSN, SENTRY_RELEASE, SENTRY_ENVIRONMENT, SENTRY_TRACES_SAMPLE_RATE } from "./Enum/EnvironmentVariable";
import { HtmlUtils } from "./Utils/HtmlUtils";
import App from "./Components/App.svelte";
import { iframeListener } from "./IframeListener";

if (SENTRY_DSN != undefined) {
    try {
        const sentryOptions: Sentry.BrowserOptions = {
            dsn: SENTRY_DSN,
            environment: SENTRY_ENVIRONMENT,
            integrations: [new Sentry.BrowserTracing()],
        };
        if (SENTRY_TRACES_SAMPLE_RATE != undefined) {
            // Set tracesSampleRate to 1.0 to capture 100%
            // of transactions for performance monitoring.
            // We recommend adjusting this value in production
            sentryOptions.tracesSampleRate = parseFloat(SENTRY_TRACES_SAMPLE_RATE);
        }
        if (SENTRY_RELEASE != undefined) {
            // Make sure this value is identical to the name you give the release that you
            // create below using Sentry CLI
            sentryOptions.release = SENTRY_RELEASE;
        }
        Sentry.init(sentryOptions);
        console.info("Sentry initialized");
    } catch (e) {
        console.error("Error while initializing Sentry", e);
    }
}

iframeListener.init();

const app = new App({
    target: HtmlUtils.getElementByIdOrFail("main-container"),
});

export default app;
