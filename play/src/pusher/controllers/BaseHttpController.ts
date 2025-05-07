import { Application } from "express";

export abstract class BaseHttpController {
    constructor(protected app: Application) {
        this.routes();
    }

    protected abstract routes(): void;
}
