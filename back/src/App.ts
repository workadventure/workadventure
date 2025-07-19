// lib/app.ts
import express, { Express } from "express";
import { PrometheusController } from "./Controller/PrometheusController";
import { DebugController } from "./Controller/DebugController";
import { PingController } from "./Controller/PingController";
import { HTTP_PORT, PROMETHEUS_PORT } from "./Enum/EnvironmentVariable";
import { GoogleOAuthController } from "./Controller/GoogleOAuthController";
import session from "express-session";

class App {
    private app: Express;
    private prometheusApp: Express | undefined;
    private prometheusController: PrometheusController;
    private debugController: DebugController;
    private pingController: PingController;
    private googleOAuthController: GoogleOAuthController;

    constructor() {
        // Création de l'application principale
        this.app = express();
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(
            session({
                secret: "your-secret-key", // TODO Replace with a strong secret
                resave: false,
                saveUninitialized: true,
                cookie: { secure: "auto" }, // Set to true if using HTTPS
            })
        );

        // Création de l'application Prometheus si nécessaire
        if (PROMETHEUS_PORT) {
            this.prometheusApp = express();
            this.prometheusApp.use(express.json());
            this.prometheusApp.use(express.urlencoded({ extended: true }));
            this.prometheusController = new PrometheusController(this.prometheusApp);
        } else {
            this.prometheusController = new PrometheusController(this.app);
        }

        this.debugController = new DebugController(this.app);
        this.pingController = new PingController(this.app);
        this.googleOAuthController = new GoogleOAuthController(this.app);
    }

    public listen(): void {
        this.app.listen(HTTP_PORT, () => console.log(`WorkAdventure HTTP API starting on port ${HTTP_PORT}!`));

        if (PROMETHEUS_PORT && this.prometheusApp) {
            this.prometheusApp.listen(PROMETHEUS_PORT, () =>
                console.log(`WorkAdventure Prometheus API starting on port ${PROMETHEUS_PORT}!`)
            );
        }
    }
}

export default new App();
