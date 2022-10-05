import type { MiddlewareNext, MiddlewarePromise, Request, Response } from "hyper-express";
import { FRONT_URL } from "../enums/EnvironmentVariable";

export function cors(req: Request, res: Response, next?: MiddlewareNext): MiddlewarePromise {
    return new Promise(() => {
        res.setHeader(
            "access-control-allow-headers",
            "Origin, X-Requested-With, Content-Type, Accept, Authorization, Pragma, Cache-Control"
        );
        res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
        if (FRONT_URL === "*") {
            res.setHeader("access-control-allow-origin", req.header("Origin"));
        } else {
            res.setHeader("access-control-allow-origin", FRONT_URL);
        }
        res.setHeader("access-control-allow-credentials", "true");

        if (next) {
            next();
        }
    });
}
