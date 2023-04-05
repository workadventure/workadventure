import { HttpRequest, HttpResponse } from "uWebSockets.js";
import { register, collectDefaultMetrics } from "prom-client";
import { App } from "../Server/sifrr.server";
import { PROMETHEUS_AUTHORIZATION_TOKEN } from "../Enum/EnvironmentVariable";

export class PrometheusController {
    constructor(private App: App) {
        collectDefaultMetrics({
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // These are the default buckets.
        });

        this.App.get("/metrics", this.metrics.bind(this));
    }

    private metrics(res: HttpResponse, req: HttpRequest): void {
        if (!PROMETHEUS_AUTHORIZATION_TOKEN) {
            res.writeStatus("501").end("Prometheus endpoint is disabled.");
            return;
        }
        const authorizationHeader = req.getHeader("authorization");
        if (!authorizationHeader) {
            res.writeStatus("401").end("Undefined authorization header");
            return;
        }
        if (!authorizationHeader.startsWith("Bearer ")) {
            res.writeStatus("401").end('Authorization header should start with "Bearer"');
            return;
        }
        if (authorizationHeader.substring(7) !== PROMETHEUS_AUTHORIZATION_TOKEN) {
            res.writeStatus("401").end("Incorrect authorization header sent.");
            return;
        }

        res.writeHeader("Content-Type", register.contentType);
        res.end(register.metrics());
    }
}
