import type { MiddlewareNext, MiddlewarePromise, Request, Response } from "hyper-express";

export function hasToken(req: Request, res: Response, next?: MiddlewareNext): MiddlewarePromise {
    return new Promise((resolve, reject) => {
        const authorizationHeader = req.header("Authorization");

        if (!authorizationHeader) {
            res.status(401).send("Undefined authorization header");
            return reject();
        }

        if (next) {
            next();
            return resolve();
        }
    });
}
