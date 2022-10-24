import type { Response, Server } from "hyper-express";
import axios from "axios";
import { isErrorApiData } from "../../messages/JsonMessages/ErrorApiData";
import { DEBUG_ERROR_MESSAGES } from "../enums/EnvironmentVariable";

export class BaseHttpController {
    constructor(protected app: Server) {
        this.routes();
    }

    protected routes(): void {
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
                        (e.response.data && e.message ? e.message : e.response.statusText)
                );
            } else res.json(errorType.data);
            return;
        } else {
            let errorMessage = "An error occurred";
            if (DEBUG_ERROR_MESSAGES) {
                if (e instanceof Error) {
                    errorMessage += "\n" + e.message + "\n" + e.stack;
                } else if (typeof e === "string") {
                    errorMessage += "\n" + e;
                }
            }

            res.status(500);
            res.send(errorMessage);
            return;
        }
    }
}
