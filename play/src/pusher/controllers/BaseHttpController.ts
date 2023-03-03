import { MonitoringInterface } from "../../services/MonitoringInterface";
import type { Server } from "hyper-express";

export abstract class BaseHttpController {
    constructor(protected app: Server, protected monitoringInterface: MonitoringInterface) {
        this.routes();
    }

    protected abstract routes(): void;
}
