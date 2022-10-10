import type { MiddlewareNext, MiddlewarePromise, Request, Response } from "hyper-express";
import { ADMIN_API_TOKEN } from "../enums/EnvironmentVariable";

export function adminToken(req: Request, res: Response, next?: MiddlewareNext): MiddlewarePromise {
    return new Promise((resolve, reject) => {
        let token = req.header("admin-token"); // @deprecated, use the authorization header instead.
        token = token || req.header("authorization");

        if (ADMIN_API_TOKEN === "") {
            res.status(401).end("No token configured!");
            return reject();
        }
        if (token !== ADMIN_API_TOKEN) {
            console.error("Admin access refused for token: " + token);
            res.status(401).end("Incorrect token");
            return reject();
        }

        if (next) {
            next();
        }

        return resolve();
    });
}
