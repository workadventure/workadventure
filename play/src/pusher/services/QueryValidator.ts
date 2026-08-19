import type { z, ZodObject, ZodRawShape } from "zod";
import type { Request, Response } from "express";
import type { UpgradeFailedData } from "../controllers/IoSocketController";

function validateObject<T extends ZodObject<ZodRawShape>>(
    obj: unknown,
    res: Response,
    validator: T,
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
    validator: T,
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
    validator: T,
): z.infer<T> | undefined {
    return validateObject(req.body, res, validator);
}

/**
 * The same for a websocket upgrade. The query is the one the request already parsed, so this is
 * the same validation as above; only the failure differs, because a socket carries its error to
 * the client over the connection rather than as a 400 nobody would read.
 */
export function validateWebsocketQuery<T extends ZodObject<ZodRawShape>>(
    req: Request,
    validator: T,
): { success: true; data: z.infer<T> } | { success: false; failure: UpgradeFailedData } {
    const result = validator.safeParse(req.query);

    if (result.success) {
        return { success: true, data: result.data };
    }

    const messages = result.error.issues.map((issue) => "Parameter " + issue.path + ": " + issue.message);

    return {
        success: false,
        failure: {
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
        },
    };
}
