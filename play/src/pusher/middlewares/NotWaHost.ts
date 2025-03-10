import type { NextFunction, Request, Response } from "express";

export function notWaHost(req: Request, res: Response, next: NextFunction): void {
    if (req.hostname.endsWith("workadventu.re")) {
        res.status(404).send();
    }

    return next();
}
