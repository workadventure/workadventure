import {Application, Request, Response} from "express";
import {IoSocketController} from "_Controller/IoSocketController";
const register = require('prom-client').register;
const collectDefaultMetrics = require('prom-client').collectDefaultMetrics;

export class PrometheusController {
    constructor(private App: Application, private ioSocketController: IoSocketController) {
        collectDefaultMetrics({
            timeout: 10000,
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // These are the default buckets.
        });

        this.App.get("/metrics", this.metrics.bind(this));
    }

    private metrics(req: Request, res: Response): void {
        res.set('Content-Type', register.contentType);
        res.end(register.metrics());
    }
}
