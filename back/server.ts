// lib/server.ts
import * as grpc from "@grpc/grpc-js";
import * as Sentry from "@sentry/node";
import { RoomManagerService, SpaceManagerService } from "@workadventure/messages/src/ts-proto-generated/services";
import App from "./src/App";
import { roomManager } from "./src/RoomManager";
import {
    HTTP_PORT,
    GRPC_PORT,
    ENABLE_TELEMETRY,
    SENTRY_DSN,
    SENTRY_RELEASE,
    SENTRY_ENVIRONMENT,
    SENTRY_TRACES_SAMPLE_RATE,
} from "./src/Enum/EnvironmentVariable";
import { telemetryService } from "./src/Services/TelemetryService";
import { spaceManager } from "./src/SpaceManager";

if (ENABLE_TELEMETRY) {
    telemetryService.startTelemetry().catch((e) => console.error(e));
}
App.listen(HTTP_PORT, () => console.log(`WorkAdventure HTTP API starting on port %d!`, HTTP_PORT));

// Sentry integration
if (SENTRY_DSN != undefined) {
    try {
        const sentryOptions: Sentry.NodeOptions = {
            dsn: SENTRY_DSN,
            release: SENTRY_RELEASE,
            environment: SENTRY_ENVIRONMENT,
            tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
        };

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
