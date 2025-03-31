import type { z, ZodObject } from "zod";
import type { ZodRawShape } from "zod/lib/types";
import type { Request, Response } from "express";
import { HttpRequest, HttpResponse, us_socket_context_t } from "uWebSockets.js";
import { UpgradeFailedData } from "../controllers/IoSocketController";

function validateObject<T extends ZodObject<ZodRawShape>>(
    obj: unknown,
    res: Response,
    validator: T
): z.infer<T> | undefined {
    const result = validator.safeParse(obj);

    if (result.success) {
        return result.data;
    } else {
        const messages = result.error.issues.map((issue) => "Parameter " + issue.path + ": " + issue.message);
        res.status(400).json(messages);
        return undefined;
    }
}

/**
 * Either validates the GET query and returns the parsed query data (according to the validator passed in parameter)
 * or fills the response with a HTTP 400 message and returns undefined.
 */
export function validateQuery<T extends ZodObject<ZodRawShape>>(
    req: Request,
    res: Response,
    validator: T
): z.infer<T> | undefined {
    return validateObject(req.query, res, validator);
}

/**
 * Either validates the POST query and returns the parsed query data (according to the validator passed in parameter)
 * or fills the response with a HTTP 400 message and returns undefined.
 */
export function validatePostQuery<T extends ZodObject<ZodRawShape>>(
    req: Request,
    res: Response,
    validator: T
): z.infer<T> | undefined {
    return validateObject(req.body, res, validator);
}

/**
 * Either validates the query and returns the parsed query data (according to the validator passed in parameter)
 * or fills the response with a HTTP 400 message and returns undefined.
 */
export function validateWebsocketQuery<T extends ZodObject<ZodRawShape>>(
    req: HttpRequest,
    res: HttpResponse,
    context: us_socket_context_t,
    validator: T
): z.infer<T> | undefined {
    const urlSearchParams = new URLSearchParams(req.getQuery());
    const params: Record<string, string | string[]> = {};
    for (const key of [...new Set(urlSearchParams.keys())]) {
        const values = urlSearchParams.getAll(key);
        params[key] = values.length > 1 ? values : values[0];
    }
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
                error: {
                    status: "error",
                    type: "error",
                    title: "400 Bad Request",
                    subtitle: "Something wrong happened while connecting!",
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
