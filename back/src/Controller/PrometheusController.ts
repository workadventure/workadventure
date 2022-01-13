import { App } from "../Server/sifrr.server";
import { HttpRequest, HttpResponse } from "uWebSockets.js";
import { register, collectDefaultMetrics } from "prom-client";

export class PrometheusController {
    constructor(private App: App) {
        collectDefaultMetrics({
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // These are the default buckets.
        });

        this.App.get("/metrics", this.metrics.bind(this));
    }

    private metrics(res: HttpResponse, req: HttpRequest): void {
        res.writeHeader("Content-Type", register.contentType);
        res.end(register.metrics());
    }
}
