// lib/app.ts
import { PrometheusController } from "./Controller/PrometheusController.js";
import { DebugController } from "./Controller/DebugController.js";
import { App as uwsApp } from "./Server/sifrr.server.js";
import { PingController } from "./Controller/PingController.js";

class App {
    public app: uwsApp;
    public prometheusController: PrometheusController;
    private debugController: DebugController;
    private pingController: PingController;

    constructor() {
        this.app = new uwsApp();

        this.prometheusController = new PrometheusController(this.app);
        this.debugController = new DebugController(this.app);
        this.pingController = new PingController(this.app);
    }
}

export default new App().app;
