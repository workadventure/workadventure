import { register, collectDefaultMetrics } from "prom-client";
import { Server } from "hyper-express";
import { BaseHttpController } from "./BaseHttpController";
import Request from "hyper-express/types/components/http/Request";
import Response from "hyper-express/types/components/http/Response";
import { PROMETHEUS_AUTHORIZATION_TOKEN } from "../Enum/EnvironmentVariable";

export class PrometheusController extends BaseHttpController {
    constructor(app: Server) {
        super(app);
        collectDefaultMetrics({
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // These are the default buckets.
        });
    }

    routes() {
        this.app.get("/metrics", this.metrics.bind(this));
    }

    private metrics(req: Request, res: Response): void {
        if (!PROMETHEUS_AUTHORIZATION_TOKEN) {
            res.status(501).send("Prometheus endpoint is disabled.");
            return;
        }
        const authorizationHeader = req.header("Authorization");
        if (!authorizationHeader) {
            res.status(401).send("Undefined authorization header");
            return;
        }
        if (!authorizationHeader.startsWith("Bearer ")) {
            res.status(401).send('Authorization header should start with "Bearer"');
            return;
        }
        if (authorizationHeader.substring(7) !== PROMETHEUS_AUTHORIZATION_TOKEN) {
            res.status(401).send("Incorrect authorization header sent.");
            return;
        }

        res.setHeader("Content-Type", register.contentType);
        res.end(register.metrics());
    }
}
