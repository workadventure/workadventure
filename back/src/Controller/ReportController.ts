import {BaseController} from "./BaseController";
import {HttpRequest, HttpResponse, TemplatedApp} from "uWebSockets.js";
import {IoSocketController} from "./IoSocketController";

export class ReportController extends BaseController {

    constructor(private App: TemplatedApp, private ioSocketController: IoSocketController) {
        super();
        this.teleport();
    }

    teleport(){
        this.App.options("/teleport", (res: HttpResponse, req: HttpRequest) => {
            this.checkAdminToken(req);
            this.addCorsHeaders(res);
            res.end();
        });

        this.App.post("/teleport", (res: HttpResponse, req: HttpRequest) => {
            (async () => {
                try {
                    this.checkAdminToken(req);
                    this.addCorsHeaders(res);

                    res.onAborted(() => {
                        console.warn('Login request was aborted');
                    })
                    const param = await res.json();
                    this.ioSocketController.teleport(param.userUuid);
                    res.writeStatus("200 OK").end();
                } catch (e) {
                    console.log("An error happened", e)
                    res.writeStatus(e.status || "500 Internal Server Error").end('An error happened');
                }
            })();
        });
    }
}