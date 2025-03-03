import { register, collectDefaultMetrics } from "prom-client";
import type { Request, Response, Application } from "express";
import { PROMETHEUS_AUTHORIZATION_TOKEN, PROMETHEUS_PORT } from "../enums/EnvironmentVariable";
import { BaseHttpController } from "./BaseHttpController";

export class PrometheusController extends BaseHttpController {
    constructor(app: Application) {
        super(app);
        collectDefaultMetrics({
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // These are the default buckets.
        });
    }

    routes(): void {
        this.app.get("/metrics", this.metrics.bind(this));
    }

    private async metrics(req: Request, res: Response): Promise<void> {
        if (!PROMETHEUS_PORT && !PROMETHEUS_AUTHORIZATION_TOKEN) {
            res.status(501).send("Prometheus endpoint is disabled.");
            return;
        }
        if (PROMETHEUS_AUTHORIZATION_TOKEN) {
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
        }

        const metrics = await register.metrics();
        res.setHeader("Content-Type", register.contentType);
        res.end(metrics);
    }
}
