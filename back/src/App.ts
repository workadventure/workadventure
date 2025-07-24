// lib/app.ts
import express, { Express } from "express";
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
        this.app.listen(HTTP_PORT, () => console.log(`WorkAdventure HTTP API starting on port ${HTTP_PORT}!`));

        if (PROMETHEUS_PORT && this.prometheusApp) {
            this.prometheusApp.listen(PROMETHEUS_PORT, () =>
                console.log(`WorkAdventure Prometheus API starting on port ${PROMETHEUS_PORT}!`)
            );
        }
    }

    public async init() {
        setCapabilities(await sharedAdminApi.initialise());
    }

    public grpcListen(): void {
        const server = new grpc.Server();
        server.addService(RoomManagerService, roomManager);
        server.addService(SpaceManagerService, spaceManager);

        server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err) => {
            if (err) {
                throw err;
            }
            console.log("WorkAdventure HTTP/2 API starting on port %d!", GRPC_PORT);
        });
    }
}

export default new App();
