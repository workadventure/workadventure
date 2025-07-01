// lib/app.ts
import * as grpc from "@grpc/grpc-js";
import { RoomManagerService, SpaceManagerService } from "@workadventure/messages/src/ts-proto-generated/services";
import { adminApi } from "../../libs/shared-utils/src/AdminApi";
import { roomManager } from "./RoomManager";
import { HTTP_PORT, PROMETHEUS_PORT, GRPC_PORT } from "./Enum/EnvironmentVariable";
import { PingController } from "./Controller/PingController";
import { App as uwsApp } from "./Server/sifrr.server";
import { DebugController } from "./Controller/DebugController";
import { PrometheusController } from "./Controller/PrometheusController";
import { spaceManager } from "./SpaceManager";
import { setCapabilities } from "./Services/Capabilities";

class App {
    private app: uwsApp;
    private prometheusApp: uwsApp | undefined;
    private prometheusController: PrometheusController;
    private debugController: DebugController;
    private pingController: PingController;

    constructor() {
        this.app = new uwsApp();

        if (PROMETHEUS_PORT) {
            this.prometheusApp = new uwsApp();
            this.prometheusController = new PrometheusController(this.prometheusApp);
        } else {
            this.prometheusController = new PrometheusController(this.app);
        }
        this.debugController = new DebugController(this.app);
        this.pingController = new PingController(this.app);
    }

    public listen(): void {
        this.app.listen(HTTP_PORT, () => console.log(`WorkAdventure HTTP API starting on port %d!`, HTTP_PORT));
        if (PROMETHEUS_PORT && this.prometheusApp) {
            this.prometheusApp.listen(PROMETHEUS_PORT, () =>
                console.log(`WorkAdventure Prometheus API starting on port %d!`, PROMETHEUS_PORT)
            );
        }
    }

    public async init() {
        setCapabilities(await adminApi.initialise());
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
