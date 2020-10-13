// lib/app.ts
import {IoSocketController} from "./Controller/IoSocketController"; //TODO fix import by "_Controller/..."
import {AuthenticateController} from "./Controller/AuthenticateController"; //TODO fix import by "_Controller/..."
import {MapController} from "./Controller/MapController";
import {PrometheusController} from "./Controller/PrometheusController";
import {FileController} from "./Controller/FileController";
import {DebugController} from "./Controller/DebugController";
import {App as uwsApp} from "./Server/sifrr.server";
import {ReportController} from "./Controller/ReportController";

class App {
    public app: uwsApp;
    public ioSocketController: IoSocketController;
    public authenticateController: AuthenticateController;
    public fileController: FileController;
    public mapController: MapController;
    public prometheusController: PrometheusController;
    private debugController: DebugController;
    private reportController: ReportController;

    constructor() {
        this.app = new uwsApp();

        //create socket controllers
        this.ioSocketController = new IoSocketController(this.app);
        this.authenticateController = new AuthenticateController(this.app);
        this.fileController = new FileController(this.app);
        this.mapController = new MapController(this.app);
        this.reportController = new ReportController(this.app, this.ioSocketController);
        this.prometheusController = new PrometheusController(this.app, this.ioSocketController);
        this.debugController = new DebugController(this.app, this.ioSocketController);
    }
}

export default new App().app;
