import { Express } from "express";

export class PingController {
    constructor(private app: Express) {
        this.ping();
    }

    private ping() {
        this.app.get("/ping", (req, res) => {
            res.send("pong");
        });
    }
}
