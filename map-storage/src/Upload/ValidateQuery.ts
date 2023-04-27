import { z, ZodObject } from "zod";
import { ZodRawShape } from "zod/lib/types";
import { Request, Response } from "express";

/**
 * Either validates the query and returns the parsed query data (according to the validator passed in parameter)
 * or fills the response with a HTTP 400 message and returns undefined.
 */
export function validateQuery<T extends ZodObject<ZodRawShape>>(
    req: Request,
    res: Response,
    validator: T
): z.infer<T> | undefined {
    const result = validator.safeParse(req.query);

    if (result.success) {
        return result.data;
    } else {
        const flattenedErrors = result.error.flatten((issue): string => {
            return `For field "${issue.path.join(".")}": ${issue.message}`;
        });

        res.status(400).send(Object.values(flattenedErrors.fieldErrors).join("\n"));
        return undefined;
    }
}
