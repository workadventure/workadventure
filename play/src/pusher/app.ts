import fs from "fs";
import express, { Application } from "express";
import cookieParser from "cookie-parser";
import * as Sentry from "@sentry/node";
import cors from "cors";
import uWebsockets from "uWebSockets.js";
import { IoSocketController } from "./controllers/IoSocketController";
import { AuthenticateController } from "./controllers/AuthenticateController";
import { MapController } from "./controllers/MapController";
import { PrometheusController } from "./controllers/PrometheusController";
import { DebugController } from "./controllers/DebugController";
import { AdminController } from "./controllers/AdminController";
import { OpenIdProfileController } from "./controllers/OpenIdProfileController";
import { WokaListController } from "./controllers/WokaListController";
import { SwaggerController } from "./controllers/SwaggerController";
import { ALLOWED_CORS_ORIGIN, ENABLE_OPENAPI_ENDPOINT, PROMETHEUS_PORT } from "./enums/EnvironmentVariable";
import { PingController } from "./controllers/PingController";
import { CompanionListController } from "./controllers/CompanionListController";
import { FrontController } from "./controllers/FrontController";
import { globalErrorHandler } from "./services/GlobalErrorHandler";
import { adminApi } from "./services/AdminApi";
import { jwtTokenManager } from "./services/JWTTokenManager";
import { CompanionService } from "./services/CompanionService";
import { WokaService } from "./services/WokaService";
import { UserController } from "./controllers/UserController";
import { MatrixRoomAreaController } from "./controllers/MatrixRoomAreaController";

class App {
    private readonly app: Application;
    private readonly websocketApp: uWebsockets.TemplatedApp;
    private readonly prometheusWebserver: Application | undefined;

    constructor() {
        this.websocketApp = uWebsockets.App();
        this.app = express();

        this.app.use(express.json());
        this.app.use(express.urlencoded());
        // It seems the cookieParser type is not yet compatible with express 5
        //eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        this.app.use(cookieParser());

        // Global middlewares
        this.app.use(
            cors({
                origin: ALLOWED_CORS_ORIGIN === "*" ? true : ALLOWED_CORS_ORIGIN,
                methods: ["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"],
                allowedHeaders: [
                    "Content-Type",
                    "Authorization",
                    "Origin",
                    "X-Requested-With",
                    "Accept",
                    "Pragma",
                    "Cache-Control",
                ],
                credentials: true,
            })
        );

        //this.app.set_error_handler(globalErrorHandler);

        let path: string;
        if (fs.existsSync("dist/public")) {
            // In prod mode
            path = "dist/public";
        } else if (fs.existsSync("public")) {
            // In dev mode
            path = "public";
        } else {
            throw new Error("Could not find public folder");
        }

        // Socket controllers
        new IoSocketController(this.websocketApp);

        // Http controllers
        new AuthenticateController(this.app);
        new MapController(this.app);
        if (PROMETHEUS_PORT) {
            this.prometheusWebserver = express();
            new PrometheusController(this.prometheusWebserver);
        } else {
            new PrometheusController(this.app);
        }
        new DebugController(this.app);
        new AdminController(this.app);
        new OpenIdProfileController(this.app);
        new PingController(this.app);

        if (ENABLE_OPENAPI_ENDPOINT) {
            new SwaggerController(this.app);
        }
        new FrontController(this.app);
        new UserController(this.app);
        new MatrixRoomAreaController(this.app);

        const staticOptions = {
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
                ".gif",
            ],
            etag: true,
            maxAge: "15d",
        };

        this.app.use(
            "assets",
            express.static(path + "/assets", {
                ...staticOptions,
                maxAge: "1y",
            })
        );

        this.app.use(
            "resources",
            express.static(path + "/resources", {
                ...staticOptions,
                maxAge: "1d",
            })
        );

        this.app.use(
            "static",
            express.static(path + "/static", {
                ...staticOptions,
                maxAge: "1d",
            })
        );

        this.app.use(
            "collections",
            express.static(path + "/collections", {
                ...staticOptions,
                maxAge: "1d",
            })
        );

        this.app.use(
            express.static(path, {
                ...staticOptions,
                maxAge: "1h",
            })
        );

        this.app.use(globalErrorHandler);
    }

    public async init() {
        const companionListController = new CompanionListController(this.app, jwtTokenManager);
        const wokaListController = new WokaListController(this.app, jwtTokenManager);

        try {
            const capabilities = await adminApi.initialise();
            companionListController.setCompanionService(CompanionService.get(capabilities));
            wokaListController.setWokaService(WokaService.get(capabilities));
        } catch (error) {
            console.error("Failed to initialize: problem getting AdminAPI capabilities", error);
            Sentry.captureException(`Failed to initialized companion and woka services : ${error}`);
        }
    }

    public listenWebServer(port: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.app.listen(port, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    public listenWebSocket(port: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.websocketApp.listen(port, (token) => {
                if (token) {
                    resolve();
                } else {
                    reject(new Error(`Error starting WorkAdventure Pusher on port ${port}!`));
                }
            });
        });
    }

    public listenPrometheusPort(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (PROMETHEUS_PORT && this.prometheusWebserver) {
                this.prometheusWebserver.listen(PROMETHEUS_PORT, (err) => {
                    if (err) {
                        console.error(err);
                        Sentry.captureException(err);
                        reject(err);
                        return;
                    }
                    console.info(`WorkAdventure Prometheus web-server started on port ${PROMETHEUS_PORT}!`);
                    resolve();
                });
            }
            return;
        });
    }
}

export default new App();
