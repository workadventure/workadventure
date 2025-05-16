import type { NextFunction, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { MAP_STORAGE_API_TOKEN } from "../enums/EnvironmentVariable";

export function mapStorageToken(req: Request, res: Response, next: NextFunction): void {
    const token = req.header("authorization");

    if (!MAP_STORAGE_API_TOKEN) {
        res.status(401).end("No token configured!");
        return;
    }
    console.log("Map Storage token: " + token + " vs " + MAP_STORAGE_API_TOKEN);
    if (token !== MAP_STORAGE_API_TOKEN) {
        console.error("Map Storage access refused for token: " + token);
        Sentry.captureException("Map storage access refused for token: " + token);
        res.status(401).end("Incorrect token");
        return;
    }

    next();
}
