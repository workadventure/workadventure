import type { NextFunction, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { jwtTokenManager } from "../services/JWTTokenManager";

export type ResponseWithUserIdentifier = Response & {
    userIdentifier?: string;
    isLogged?: boolean;
};

export function authenticated(req: Request, res: ResponseWithUserIdentifier, next: NextFunction): void {
    const token = req.header("authorization");
    if (!token) {
        res.status(401).send("Missing authorization header");
        return;
    }

    try {
        const jwtData = jwtTokenManager.verifyJWTToken(token);
        // Let's set the "uuid" param
        res.userIdentifier = jwtData.identifier;
        res.isLogged = !!jwtData.accessToken;
    } catch (e) {
        Sentry.captureException(`Connection refused for token: ${token} ${e}`);
        console.error("Connection refused for token: " + token, e);

        res.status(401).send("Invalid token sent");
        return;
    }

    next();
}
