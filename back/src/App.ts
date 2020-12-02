// lib/app.ts
import {AuthenticateController} from "./Controller/AuthenticateController"; //TODO fix import by "_Controller/..."
import {MapController} from "./Controller/MapController";
import {PrometheusController} from "./Controller/PrometheusController";
import {FileController} from "./Controller/FileController";
import {DebugController} from "./Controller/DebugController";
import {App as uwsApp} from "./Server/sifrr.server";

class App {
    public app: uwsApp;
    //public authenticateController: AuthenticateController;
    //public fileController: FileController;
    //public mapController: MapController;
    public prometheusController: PrometheusController;
    private debugController: DebugController;

    constructor() {
        this.app = new uwsApp();

        //create socket controllers
        //this.authenticateController = new AuthenticateController(this.app);
        //this.fileController = new FileController(this.app);
        //this.mapController = new MapController(this.app);
        this.prometheusController = new PrometheusController(this.app);
        this.debugController = new DebugController(this.app);
    }
}

export default new App().app;
