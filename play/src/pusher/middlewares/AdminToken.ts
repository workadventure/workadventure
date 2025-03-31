import type { NextFunction, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { ADMIN_API_TOKEN } from "../enums/EnvironmentVariable";

export function adminToken(req: Request, res: Response, next: NextFunction): void {
    let token = req.header("admin-token"); // @deprecated, use the authorization header instead.
    token = token || req.header("authorization");

    if (!ADMIN_API_TOKEN) {
        res.status(401).end("No token configured!");
        return;
    }
    if (token !== ADMIN_API_TOKEN) {
        console.error("Admin access refused for token: " + token);
        Sentry.captureException("Admin access refused for token: " + token);
        res.status(401).end("Incorrect token");
        return;
    }

    next();
}
