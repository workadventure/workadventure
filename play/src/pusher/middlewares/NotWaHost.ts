import type { MiddlewareNext, MiddlewarePromise, Request, Response } from "hyper-express";

export function notWaHost(req: Request, res: Response, next: MiddlewareNext): MiddlewarePromise | void {
    if (req.hostname.endsWith("workadventu.re")) {
        res.status(404).send();
    }

    return next();
}
