import type { MiddlewareNext, MiddlewarePromise, Request, Response } from "hyper-express";
import { ALLOWED_CORS_ORIGIN } from "../enums/EnvironmentVariable";

export function cors(req: Request, res: Response, next: MiddlewareNext): MiddlewarePromise | void {
    if (ALLOWED_CORS_ORIGIN) {
        res.setHeader(
            "access-control-allow-headers",
            "Origin, X-Requested-With, Content-Type, Accept, Authorization, Pragma, Cache-Control"
        );
        res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
        if (ALLOWED_CORS_ORIGIN === "*") {
            res.setHeader("access-control-allow-origin", req.header("Origin"));
        } else {
            res.setHeader("access-control-allow-origin", ALLOWED_CORS_ORIGIN);
        }
        res.setHeader("access-control-allow-credentials", "true");
        res.setHeader("x-content-type-options", "nosniff");
    }

    next();
}
