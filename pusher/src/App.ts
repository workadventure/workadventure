// lib/app.ts
import { IoSocketController } from "./Controller/IoSocketController";
import { AuthenticateController } from "./Controller/AuthenticateController";
import { MapController } from "./Controller/MapController";
import { PrometheusController } from "./Controller/PrometheusController";
import { DebugController } from "./Controller/DebugController";
import { AdminController } from "./Controller/AdminController";
import { OpenIdProfileController } from "./Controller/OpenIdProfileController";
import { WokaListController } from "./Controller/WokaListController";
import { SwaggerController } from "./Controller/SwaggerController";
import HyperExpress from "hyper-express";
import { cors } from "./Middleware/Cors";
import { ENABLE_OPENAPI_ENDPOINT } from "./Enum/EnvironmentVariable";
import { PingController } from "./Controller/PingController";
import { IoSocketChatController } from "./Controller/IoSocketChatController";

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
    }
}

export default new App().app;
