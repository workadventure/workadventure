// lib/app.ts
import { PrometheusController } from "./Controller/PrometheusController";
import { DebugController } from "./Controller/DebugController";
import { App as uwsApp } from "./Server/sifrr.server";

class App {
    public app: uwsApp;
    public prometheusController: PrometheusController;
    private debugController: DebugController;

    constructor() {
        this.app = new uwsApp();

        this.prometheusController = new PrometheusController(this.app);
        this.debugController = new DebugController(this.app);
    }
}

export default new App().app;
