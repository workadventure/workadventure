import type { z, ZodObject } from "zod";
import type { ZodRawShape } from "zod/lib/types";
import type { Request, Response } from "hyper-express";
import type HyperExpress from "hyper-express";
import { UpgradeFailedData } from "../controllers/IoSocketController";

/**
 * Either validates the query and returns the parsed query data (according to the validator passed in parameter)
 * or fills the response with a HTTP 400 message and returns undefined.
 */
export function validateQuery<T extends ZodObject<ZodRawShape>>(
    req: Request,
    res: Response,
    validator: T
): z.infer<T> | undefined {
    const result = validator.safeParse(req.query_parameters);

    if (result.success) {
        return result.data;
    } else {
        const messages = result.error.issues.map((issue) => "Parameter " + issue.path + ": " + issue.message);
        res.status(400).json(messages);
        return undefined;
    }
}

/**
 * Either validates the query and returns the parsed query data (according to the validator passed in parameter)
 * or fills the response with a HTTP 400 message and returns undefined.
 */
export function validateWebsocketQuery<T extends ZodObject<ZodRawShape>>(
    req: HyperExpress.compressors.HttpRequest,
    res: HyperExpress.compressors.HttpResponse,
    context: HyperExpress.compressors.us_socket_context_t,
    validator: T
): z.infer<T> | undefined {
    const urlSearchParams = new URLSearchParams(req.getQuery());
    const params = Object.fromEntries(urlSearchParams.entries());
    const result = validator.safeParse(params);

    if (result.success) {
        return result.data;
    } else {
        const messages = result.error.issues.map((issue) => "Parameter " + issue.path + ": " + issue.message);

        const websocketKey = req.getHeader("sec-websocket-key");
        const websocketProtocol = req.getHeader("sec-websocket-protocol");
        const websocketExtensions = req.getHeader("sec-websocket-extensions");

        res.upgrade(
            {
                rejected: true,
                reason: "error",
                status: 400,
                error: {
                    type: "error",
                    title: "400 Bad Request",
                    subtitle: "Something wrong while connection!",
                    image: "",
                    code: "WS_BAD_REQUEST",
                    details: messages.join("\n"),
                },
            } satisfies UpgradeFailedData,
            websocketKey,
            websocketProtocol,
            websocketExtensions,
            context
        );
        return undefined;
    }
}
