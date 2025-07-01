import { Express, Request, Response } from "express";
import { register, collectDefaultMetrics } from "prom-client";
import { PROMETHEUS_AUTHORIZATION_TOKEN, PROMETHEUS_PORT } from "../Enum/EnvironmentVariable";

export class PrometheusController {
    constructor(private app: Express) {
        collectDefaultMetrics({
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // These are the default buckets.
        });

        this.app.get("/metrics", this.metrics.bind(this));
    }

    private metrics(req: Request, res: Response): void {
        if (!PROMETHEUS_PORT && !PROMETHEUS_AUTHORIZATION_TOKEN) {
            res.status(501).send("Prometheus endpoint is disabled.");
            return;
        }

        if (PROMETHEUS_AUTHORIZATION_TOKEN) {
            const authorizationHeader = req.headers.authorization;
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

        res.setHeader("Content-Type", register.contentType);
        res.send(register.metrics());
    }
}
