import Request from "hyper-express/types/components/http/Request";
import Response from "hyper-express/types/components/http/Response";
import { z, ZodObject } from "zod";
import { parse } from "query-string";
import { ZodRawShape } from "zod/lib/types";

/**
 * Either validates the query and returns the parsed query data (according to the validator passed in parameter)
 * or fills the response with a HTTP 400 message and returns undefined.
 */
export function validateQuery<T extends ZodObject<ZodRawShape>>(
    req: Request,
    res: Response,
    validator: T
): z.infer<T> | undefined {
    const result = validator.safeParse(parse(req.path_query));

    if (result.success) {
        return result.data;
    } else {
        const messages = result.error.issues.map((issue) => "Parameter " + issue.path + ": " + issue.message);
        res.status(400).json(messages);
        return undefined;
    }
}
