import { Server } from "hyper-express";
import Response from "hyper-express/types/components/http/Response";
import axios from "axios";
import { isErrorApiData } from "../Messages/JsonMessages/ErrorApiData";

export class BaseHttpController {
    constructor(protected app: Server) {
        this.routes();
    }

    protected routes() {
        /* Define routes on children */
    }

    protected castErrorToResponse(e: unknown, res: Response): void {
        if (e instanceof Error) {
            let url: string | undefined;
            if (axios.isAxiosError(e)) {
                url = e.config.url;
                if (url !== undefined) {
                    url = " for URL: " + url;
                } else {
                    url = "";
                }
            }

            console.error("ERROR: " + e.message + url);
            console.error(e.stack);
        } else if (typeof e === "string") {
            console.error(e);
        }

        if (axios.isAxiosError(e) && e.response) {
            res.status(e.response.status);
            const errorType = isErrorApiData.safeParse(e?.response?.data);
            if (!errorType.success) {
                res.send(
                    "An error occurred: " +
                        e.response.status +
                        " " +
                        (e.response.data && e.response.data.message ? e.response.data.message : e.response.statusText)
                );
            } else res.json(errorType.data);
            return;
        } else {
            res.status(500);
            res.send("An error occurred");
            return;
        }
    }
}
