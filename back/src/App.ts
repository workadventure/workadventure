// lib/app.ts
import { PrometheusController } from "./Controller/PrometheusController";
import { DebugController } from "./Controller/DebugController";
import { App as uwsApp } from "./Server/sifrr.server";
import { PingController } from "./Controller/PingController";

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
