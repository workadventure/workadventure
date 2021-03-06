// lib/app.ts
import {IoSocketController} from "./Controller/IoSocketController"; //TODO fix import by "_Controller/..."
import {AuthenticateController} from "./Controller/AuthenticateController"; //TODO fix import by "_Controller/..."
import {MapController} from "./Controller/MapController";
import {PrometheusController} from "./Controller/PrometheusController";
import {DebugController} from "./Controller/DebugController";
import {App as uwsApp} from "./Server/sifrr.server";

class App {
    public app: uwsApp;
    public ioSocketController: IoSocketController;
    public authenticateController: AuthenticateController;
    public mapController: MapController;
    public prometheusController: PrometheusController;
    private debugController: DebugController;

    constructor() {
        this.app = new uwsApp();

        //create socket controllers
        this.ioSocketController = new IoSocketController(this.app);
        this.authenticateController = new AuthenticateController(this.app);
        this.mapController = new MapController(this.app);
        this.prometheusController = new PrometheusController(this.app);
        this.debugController = new DebugController(this.app);
    }
}

export default new App().app;
