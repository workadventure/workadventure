import type { Server } from "hyper-express";

export abstract class BaseHttpController {
    constructor(protected app: Server) {
        this.routes();
    }

    protected abstract routes(): void;
}
