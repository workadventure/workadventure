// lib/app.ts
import type { Express } from "express";
import express from "express";
import * as grpc from "@grpc/grpc-js";
import { RoomManagerService, SpaceManagerService } from "@workadventure/messages/src/ts-proto-generated/services";
import { SharedAdminApi } from "@workadventure/shared-utils/src/SharedAdminApi";
import { DebugController } from "./Controller/DebugController";
import { PrometheusController } from "./Controller/PrometheusController";
import { roomManager } from "./RoomManager";
import {
    HTTP_PORT,
    PROMETHEUS_PORT,
    GRPC_PORT,
    ADMIN_API_RETRY_DELAY,
    ADMIN_API_URL,
    GRPC_MAX_MESSAGE_SIZE,
} from "./Enum/EnvironmentVariable";
import { PingController } from "./Controller/PingController";
import { spaceManager } from "./SpaceManager";
import { setCapabilities } from "./Services/Capabilities";

const sharedAdminApi = new SharedAdminApi(ADMIN_API_RETRY_DELAY, ADMIN_API_URL);
class App {
    private app: Express;
    private prometheusApp: Express | undefined;
    private prometheusController: PrometheusController;
    private debugController: DebugController;
    private pingController: PingController;

    constructor() {
        // Création de l'application principale
        this.app = express();
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Création de l'application Prometheus si nécessaire
        if (PROMETHEUS_PORT) {
            this.prometheusApp = express();
            this.prometheusApp.use(express.json());
            this.prometheusApp.use(express.urlencoded({ extended: true }));
            this.prometheusController = new PrometheusController(this.prometheusApp);
        } else {
            this.prometheusController = new PrometheusController(this.app);
        }

        this.debugController = new DebugController(this.app);
        this.pingController = new PingController(this.app);
    }

    public listen(): void {
        this.app.listen(HTTP_PORT, () => console.info(`WorkAdventure HTTP API starting on port ${HTTP_PORT}!`));

        if (PROMETHEUS_PORT && this.prometheusApp) {
            this.prometheusApp.listen(PROMETHEUS_PORT, () =>
                console.info(`WorkAdventure Prometheus API starting on port ${PROMETHEUS_PORT}!`)
            );
        }
    }

    public async init() {
        setCapabilities(await sharedAdminApi.initialise());
    }

    public grpcListen(): void {
        const server = new grpc.Server({
            "grpc.max_receive_message_length": GRPC_MAX_MESSAGE_SIZE, // 20 MB
            "grpc.max_send_message_length": GRPC_MAX_MESSAGE_SIZE, // 20 MB
        });

        // When zooming in and out very quickly, each zone subscription creates a HTTP2 stream.
        // If too many streams are created in a short time, the server closes the connection with a GOAWAY frame.
        // To avoid this, we increase the streamReset settings.
        // Note: a better solution would be to use only one stream between the pusher and the back for all zones,
        // with custom "subscribe/unsubscribe to zone" messages, but this requires more work.

        // @ts-ignore The commonServerOptions is private in the grpc.Server class and there is no way to edit the streamReset settings
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        server.commonServerOptions.streamResetBurst = 10000;
        // @ts-ignore The commonServerOptions is private in the grpc.Server class and there is no way to edit the streamReset settings
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        server.commonServerOptions.streamResetRate = 1000;

        server.addService(RoomManagerService, roomManager);
        server.addService(SpaceManagerService, spaceManager);

        server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err) => {
            if (err) {
                throw err;
            }
            console.log("WorkAdventure HTTP/2 API starting on port %d!", GRPC_PORT);
            server.start();
        });
    }
}

export default new App();
