import { register, collectDefaultMetrics } from "prom-client";
import { Server } from "hyper-express";
import { BaseHttpController } from "./BaseHttpController";
import Request from "hyper-express/types/components/http/Request";
import Response from "hyper-express/types/components/http/Response";

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
        res.setHeader("Content-Type", register.contentType);
        res.end(register.metrics());
    }
}
