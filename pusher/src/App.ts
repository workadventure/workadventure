// lib/app.ts
import { IoSocketController } from "./Controller/IoSocketController"; //TODO fix import by "_Controller/..."
import { AuthenticateController } from "./Controller/AuthenticateController"; //TODO fix import by "_Controller/..."
import { MapController } from "./Controller/MapController";
import { PrometheusController } from "./Controller/PrometheusController";
import { DebugController } from "./Controller/DebugController";
import { App as uwsApp } from "./Server/sifrr.server";
import { AdminController } from "./Controller/AdminController";
import { OpenIdProfileController } from "./Controller/OpenIdProfileController";

class App {
    public app: uwsApp;
    public ioSocketController: IoSocketController;
    public authenticateController: AuthenticateController;
    public mapController: MapController;
    public prometheusController: PrometheusController;
    private debugController: DebugController;
    private adminController: AdminController;
    private openIdProfileController: OpenIdProfileController;

    constructor() {
        this.app = new uwsApp();

        //create socket controllers
        this.ioSocketController = new IoSocketController(this.app);
        this.authenticateController = new AuthenticateController(this.app);
        this.mapController = new MapController(this.app);
        this.prometheusController = new PrometheusController(this.app);
        this.debugController = new DebugController(this.app);
        this.adminController = new AdminController(this.app);
        this.openIdProfileController = new OpenIdProfileController(this.app);
    }
}

export default new App().app;
