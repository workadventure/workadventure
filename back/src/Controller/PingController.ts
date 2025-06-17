import { Express, Request, Response } from "express";

export class PingController {
    constructor(private app: Express) {
        this.app.get("/ping", this.ping.bind(this));
    }

    private ping(req: Request, res: Response): void {
        res.status(200).send("pong");
    }
}
