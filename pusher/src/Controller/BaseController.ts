import { HttpResponse } from "uWebSockets.js";
import { FRONT_URL } from "../Enum/EnvironmentVariable";

export class BaseController {
    protected addCorsHeaders(res: HttpResponse): void {
        res.writeHeader("access-control-allow-headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.writeHeader("access-control-allow-methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
        res.writeHeader("access-control-allow-origin", FRONT_URL);
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
            console.error("ERROR: " + e.message + url);
        } else if (typeof e === "string") {
            console.error(e);
        }
        if (e.stack) {
            console.error(e.stack);
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
