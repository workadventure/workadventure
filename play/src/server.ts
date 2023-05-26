import fs from "fs";
import process from "process";
import * as Sentry from "@sentry/node";
import * as grpc from "@grpc/grpc-js";
import { RoomApiService } from "@workadventure/messages/src/ts-proto-generated/room-api";
import app from "./pusher/app";
import {
    PUSHER_HTTP_PORT,
    ADMIN_API_URL,
    ROOM_API_PORT,
    ROOM_API_SECRET_KEY,
    SENTRY_DSN,
    SENTRY_RELEASE,
    SENTRY_TRACES_SAMPLE_RATE,
} from "./pusher/enums/EnvironmentVariable";
import RoomApiServer from "./room-api/RoomApiServer";

// In production, the current working directory is "dist".
if (fs.existsSync("dist") && !fs.existsSync("src")) {
    process.chdir("dist");
}

app.listen(PUSHER_HTTP_PORT)
    .then(() => console.log(`WorkAdventure Pusher started on port ${PUSHER_HTTP_PORT}!`))
    .catch((e) => console.error(e));

// Sentry integration
if (SENTRY_DSN != undefined) {
    try {
        const sentryOptions: Sentry.NodeOptions = {
            dsn: SENTRY_DSN,
        };

        if (SENTRY_TRACES_SAMPLE_RATE != undefined) {
            // Set tracesSampleRate to 1.0 to capture 100%
            // of transactions for performance monitoring.
            // We recommend adjusting this value in production
            sentryOptions.tracesSampleRate = SENTRY_TRACES_SAMPLE_RATE;
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

// Room API
if (!ADMIN_API_URL && !ROOM_API_SECRET_KEY) {
    console.info("RoomAPI is disabled! ROOM_API_SECRET_KEY is not defined on environment variables.");
} else {
    const RoomAPI = new grpc.Server();

    RoomAPI.addService(RoomApiService, RoomApiServer);

    RoomAPI.bindAsync(`0.0.0.0:${ROOM_API_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            throw err;
        }
        console.log(`RoomAPI starting on port ${ROOM_API_PORT}!`);
        RoomAPI.start();
    });
}
