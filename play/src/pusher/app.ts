import { IoSocketController } from "./controllers/IoSocketController";
import { AuthenticateController } from "./controllers/AuthenticateController";
import { MapController } from "./controllers/MapController";
import { PrometheusController } from "./controllers/PrometheusController";
import { DebugController } from "./controllers/DebugController";
import { AdminController } from "./controllers/AdminController";
import { OpenIdProfileController } from "./controllers/OpenIdProfileController";
import { WokaListController } from "./controllers/WokaListController";
import { SwaggerController } from "./controllers/SwaggerController";
import type { Server } from "hyper-express";
import HyperExpress from "hyper-express";
import { cors } from "./middlewares/Cors";
import { ENABLE_OPENAPI_ENDPOINT } from "./enums/EnvironmentVariable";
import { PingController } from "./controllers/PingController";
import { IoSocketChatController } from "./controllers/IoSocketChatController";
import { FrontController } from "./controllers/FrontController";
import fs from "fs";
import type * as uWebsockets from "uWebSockets.js";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LiveDirectory = require("live-directory");

class App {
    private app: HyperExpress.compressors.TemplatedApp;
    private webserver: Server;

    constructor() {
        this.webserver = new HyperExpress.Server();
        this.app = this.webserver.uws_instance;

        // Global middlewares
        this.webserver.use(cors);

        let path: string;
        if (fs.existsSync("public")) {
            // In dev mode
            path = "public";
        } else if (fs.existsSync("dist/public")) {
            // In prod mode
            path = "dist/public";
        } else {
            throw new Error("Could not find public folder");
        }

        /**
         * Todo: Replace this lib by the embed static middleware of HyperExpress
         *       when the v3.0 will be released.
         */
        const liveAssets = new LiveDirectory({
            path,
            keep: {
                extensions: [
                    ".css",
                    ".js",
                    ".png",
                    ".svg",
                    ".ico",
                    ".xml",
                    ".mp3",
                    ".json",
                    ".html",
                    ".ttf",
                    ".woff2",
                    ".map",
                ],
            },
        });

        liveAssets.ready().then(() => {
            console.info("All static assets has been loaded!");
        });

        // Socket controllers
        new IoSocketController(this.app);
        new IoSocketChatController(this.app);

        // Http controllers
        new AuthenticateController(this.webserver);
        new MapController(this.webserver);
        new PrometheusController(this.webserver);
        new DebugController(this.webserver);
        new AdminController(this.webserver);
        new OpenIdProfileController(this.webserver);
        new WokaListController(this.webserver);
        new PingController(this.webserver);
        if (ENABLE_OPENAPI_ENDPOINT) {
            new SwaggerController(this.webserver);
        }
        new FrontController(this.webserver, liveAssets);
    }

    public listen(port: number, host?: string): Promise<uWebsockets.us_listen_socket | string> {
        return this.webserver.listen(port, host);
    }
}

export default new App();
