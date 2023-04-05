import fs from "fs";
import process from "process";
import * as Sentry from "@sentry/node";
import { SENTRY_DNS, SENTRY_RELEASE, PUSHER_HTTP_PORT } from "./pusher/enums/EnvironmentVariable";
import app from "./pusher/app";

// In production, the current working directory is "dist".
if (fs.existsSync("dist") && !fs.existsSync("src")) {
    process.chdir("dist");
}

app.listen(PUSHER_HTTP_PORT)
    .then(() => console.log(`WorkAdventure starting on port ${PUSHER_HTTP_PORT}!`))
    .catch((e) => console.error(e));

if (SENTRY_DNS != undefined) {
    try {
        const sentryOptions: Sentry.NodeOptions = {
            dsn: SENTRY_DNS,
            // Set tracesSampleRate to 1.0 to capture 100%
            // of transactions for performance monitoring.
            // We recommend adjusting this value in production
            // To set a uniform sample rate
            tracesSampleRate: 0.2,
        };
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
