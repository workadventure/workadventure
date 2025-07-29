// lib/server.ts
import { RoomManagerService, SpaceManagerService } from "@workadventure/messages/src/ts-proto-generated/services";
import * as grpc from "@grpc/grpc-js";
import * as Sentry from "@sentry/node";
import { roomManager } from "./RoomManager";
import { spaceManager } from "./SpaceManager";
import App from "./App";
import {
    GRPC_PORT,
    ENABLE_TELEMETRY,
    SENTRY_DSN,
    SENTRY_RELEASE,
    SENTRY_ENVIRONMENT,
    SENTRY_TRACES_SAMPLE_RATE,
    GRPC_MAX_MESSAGE_SIZE,
} from "./Enum/EnvironmentVariable";
import { telemetryService } from "./Services/TelemetryService";

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
        };

        Sentry.init(sentryOptions);
        console.info("Sentry initialized");
    } catch (e) {
        console.error("Error while initializing Sentry", e);
    }
}

const server = new grpc.Server({
    "grpc.max_receive_message_length": GRPC_MAX_MESSAGE_SIZE, // 20 MB
    "grpc.max_send_message_length": GRPC_MAX_MESSAGE_SIZE, // 20 MB
});
server.addService(RoomManagerService, roomManager);
server.addService(SpaceManagerService, spaceManager);

server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        throw err;
    }
    console.log("WorkAdventure HTTP/2 API starting on port %d!", GRPC_PORT);
    server.start();
});

(async () => {
    await App.init();
    App.listen();
    App.grpcListen();
})().catch((e) => {
    console.error(e);
    Sentry.captureException(e);
});
