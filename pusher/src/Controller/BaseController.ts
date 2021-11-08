import { HttpResponse } from "uWebSockets.js";
import log from "../Services/Logger";

export class BaseController {
    protected addCorsHeaders(res: HttpResponse): void {
        res.writeHeader("access-control-allow-headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.writeHeader("access-control-allow-methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
        res.writeHeader("access-control-allow-origin", "*");
    }

    /**
     * Turns any exception into a HTTP response (and logs the error)
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected errorToResponse(e: any, res: HttpResponse): void {
        if (e && e.message) {
            let url = e?.config?.url;
            if (url !== undefined) {
                url = " for URL: " + url;
            } else {
                url = "";
            }
            log.error("ERROR: " + e.message + url);
        } else if (typeof e === "string") {
            log.error(e);
        }
        if (e.stack) {
            log.error(e.stack);
        }
        if (e.response) {
            res.writeStatus(e.response.status + " " + e.response.statusText);
            this.addCorsHeaders(res);
            res.end(
                "An error occurred: " +
                    e.response.status +
                    " " +
                    (e.response.data && e.response.data.message ? e.response.data.message : e.response.statusText)
            );
        } else {
            res.writeStatus("500 Internal Server Error");
            this.addCorsHeaders(res);
            res.end("An error occurred");
        }
    }
}
