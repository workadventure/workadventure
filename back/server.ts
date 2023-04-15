// lib/server.ts
import * as grpc from "@grpc/grpc-js";
import * as Sentry from "@sentry/node";
import { RoomManagerService, SpaceManagerService } from "@workadventure/messages/src/ts-proto-generated/services";
import App from "./src/App";
import { roomManager } from "./src/RoomManager";
import { HTTP_PORT, GRPC_PORT, ENABLE_TELEMETRY, SENTRY_DNS, SENTRY_RELEASE } from "./src/Enum/EnvironmentVariable";
import { telemetryService } from "./src/Services/TelemetryService";
import { spaceManager } from "./src/SpaceManager";

if (ENABLE_TELEMETRY) {
    telemetryService.startTelemetry().catch((e) => console.error(e));
}
App.listen(HTTP_PORT, () => console.log(`WorkAdventure HTTP API starting on port %d!`, HTTP_PORT));

// Sentry integration
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

const server = new grpc.Server();
server.addService(RoomManagerService, roomManager);
server.addService(SpaceManagerService, spaceManager);

server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        throw err;
    }
    console.log("WorkAdventure HTTP/2 API starting on port %d!", GRPC_PORT);
    server.start();
});
