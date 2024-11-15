// lib/app.ts
import { PrometheusController } from "./Controller/PrometheusController";
import { DebugController } from "./Controller/DebugController";
import { App as uwsApp } from "./Server/sifrr.server";
import { PingController } from "./Controller/PingController";
import { HTTP_PORT, PROMETHEUS_PORT } from "./Enum/EnvironmentVariable";

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
}

export default new App();
