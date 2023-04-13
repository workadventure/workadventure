import { HttpRequest, HttpResponse } from "uWebSockets.js";
import { App } from "../Server/sifrr.server";

export class PingController {
    constructor(private App: App) {
        this.App.get("/ping", this.ping.bind(this));
    }

    private ping(res: HttpResponse, req: HttpRequest): void {
        res.writeStatus("200").end("pong");
    }
}
