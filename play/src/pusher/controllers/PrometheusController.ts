import { register, collectDefaultMetrics } from "prom-client";
import type { Request, Response, Server } from "hyper-express";
import { PROMETHEUS_AUTHORIZATION_TOKEN } from "../enums/EnvironmentVariable";
import { BaseHttpController } from "./BaseHttpController";

export class PrometheusController extends BaseHttpController {
    constructor(app: Server) {
        super(app);
        collectDefaultMetrics({
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // These are the default buckets.
        });
    }

    routes(): void {
        this.app.get("/metrics", this.metrics.bind(this));
    }

    private async metrics(req: Request, res: Response): Promise<void> {
        if (!PROMETHEUS_AUTHORIZATION_TOKEN) {
            res.atomic(() => {
                res.status(501).send("Prometheus endpoint is disabled.");
            });
            return;
        }
        const authorizationHeader = req.header("Authorization");
        if (!authorizationHeader) {
            res.atomic(() => {
                res.status(401).send("Undefined authorization header");
            });
            return;
        }
        if (!authorizationHeader.startsWith("Bearer ")) {
            res.atomic(() => {
                res.status(401).send('Authorization header should start with "Bearer"');
            });
            return;
        }
        if (authorizationHeader.substring(7) !== PROMETHEUS_AUTHORIZATION_TOKEN) {
            res.atomic(() => {
                res.status(401).send("Incorrect authorization header sent.");
            });
            return;
        }

        const metrics = await register.metrics();
        res.atomic(() => {
            res.setHeader("Content-Type", register.contentType);
            res.end(metrics);
        });
    }
}
