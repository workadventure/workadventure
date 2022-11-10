import { App } from "../Server/sifrr.server.js";
import { HttpRequest, HttpResponse } from "uWebSockets.js";

export class PingController {
    constructor(private App: App) {
        this.App.get("/ping", this.ping.bind(this));
    }

    private ping(res: HttpResponse, req: HttpRequest): void {
        res.writeStatus("200").end("pong");
    }
}
