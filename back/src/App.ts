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

        this.config();
        this.crossOrigin();

        //TODO add middleware with access token to secure api

        // STUPID CORS IMPLEMENTATION.
        // TODO: SECURE THIS
        this.app.any('/*', (res, req) => {
            res.writeHeader('access-control-allow-headers', 'Origin, X-Requested-With, Content-Type, Accept');
            res.writeHeader('access-control-allow-methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
            res.writeHeader('access-control-allow-origin', '*');

            req.setYield(true);
        });

        //create socket controllers
        this.ioSocketController = new IoSocketController(this.app);
        this.authenticateController = new AuthenticateController(this.app);
        this.mapController = new MapController(this.app);
        this.prometheusController = new PrometheusController(this.app, this.ioSocketController);
        this.debugController = new DebugController(this.app, this.ioSocketController);
    }

    // TODO add session user
    private config(): void {
        /*this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended: false}));*/
    }

    private crossOrigin(){
        /*this.app.use((req: Request, res: Response, next) => {
            res.setHeader("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
            // Request methods you wish to allow
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
            // Request headers you wish to allow
            res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });*/
    }
}

export default new App().app;
