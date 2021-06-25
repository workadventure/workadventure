import { HttpResponse } from "uWebSockets.js";

export class BaseController {
    protected addCorsHeaders(res: HttpResponse): void {
        res.writeHeader("access-control-allow-headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.writeHeader("access-control-allow-methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
        res.writeHeader("access-control-allow-origin", "*");
    }
}
