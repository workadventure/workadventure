import { IoSocketController } from "./controllers/IoSocketController";
import { AuthenticateController } from "./controllers/AuthenticateController";
import { MapController } from "./controllers/MapController";
import { PrometheusController } from "./controllers/PrometheusController";
import { DebugController } from "./controllers/DebugController";
import { AdminController } from "./controllers/AdminController";
import { OpenIdProfileController } from "./controllers/OpenIdProfileController";
import { WokaListController } from "./controllers/WokaListController";
import { SwaggerController } from "./controllers/SwaggerController";
import HyperExpress from "hyper-express";
import { cors } from "./middlewares/Cors";
import { ENABLE_OPENAPI_ENDPOINT } from "./enums/EnvironmentVariable";
import { PingController } from "./controllers/PingController";
import { IoSocketChatController } from "./controllers/IoSocketChatController";
import { FrontController } from "./controllers/FrontController";

class App {
    public app: HyperExpress.compressors.TemplatedApp;

    constructor() {
        const webserver = new HyperExpress.Server();
        this.app = webserver.uws_instance;

        // Global middlewares
        webserver.use(cors);

        // Socket controllers
        new IoSocketController(this.app);
        new IoSocketChatController(this.app);

        // Http controllers
        new AuthenticateController(webserver);
        new MapController(webserver);
        new PrometheusController(webserver);
        new DebugController(webserver);
        new AdminController(webserver);
        new OpenIdProfileController(webserver);
        new WokaListController(webserver);
        new PingController(webserver);
        if (ENABLE_OPENAPI_ENDPOINT) {
            new SwaggerController(webserver);
        }
        new FrontController(webserver);
    }
}

export default new App().app;
