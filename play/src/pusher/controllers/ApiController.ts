import type { Request, Response } from "hyper-express";
import axios from "axios";
import * as Sentry from "@sentry/node";
import {z} from "zod";
import { EmbeddableResponse } from "@workadventure/messages";
import {validateQuery} from "../services/QueryValidator";
import { BaseHttpController } from "./BaseHttpController";

export class ApiController extends BaseHttpController {
    protected routes() {
        this.embeddableUrl();
    }

    /**
     * @openapi
     * /embeddable:
     *   get:
     *     description: "Checks if a website is embeddable in an iframe"
     *     parameters:
     *      - name: "url"
     *        in: "query"
     *        description: "An URL of a website to check if it is embeddable"
     *        required: true
     *        type: "string"
     *     responses:
     *       400:
     *         description: URL is not provided
     *       200:
     *         description: A JSON object with a boolean embeddable property or an error property with a message
     */
    private embeddableUrl(): void {
        this.app.get("/embeddable", async (req: Request, res: Response) => {
            const query = validateQuery(
                req,
                res,
                z.object({
                    url: z.string().url()
                })
            );
            if (query === undefined) {
                return;
            }
            const { url } = query;

            let answer: EmbeddableResponse = {state: "success", embeddable: true};
            await axios
                .head(url.toString(), {timeout: 5_000})
                .then((response) => {
                    if(response.headers["x-frame-options"]) {
                        answer = {state: "success", embeddable: false};
                    }
                })
                .catch((error) => {
                    console.error("ApiController => embeddableUrl", url, error.cause);
                    Sentry.captureException(`Error while checking if a website (${url}) is embeddable in an iframe`, error);
                    return res.status(404).json({state: "error", message: "URL is not reachable"});
                });
            return res.status(200).json(answer);
        });
    }
}
