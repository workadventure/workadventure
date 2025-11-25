import { Request, Response } from "express";
import Debug from "debug";
import * as Sentry from "@sentry/node";
import { z } from "zod";
import { validatePostQuery } from "../services/QueryValidator";
import { BaseHttpController } from "./BaseHttpController";

const debug = Debug("pusher:extension-status");

/**
 * Controller for extension status polling endpoint
 * Allows the extension to send its localStorage status to the server via HTTP polling
 */
export class ExtensionStatusController extends BaseHttpController {
    routes(): void {
        /**
         * POST /api/extension/status
         * Endpoint for extension to send its status from localStorage
         * This allows the server to be aware of the extension's status via HTTP polling
         */
        this.app.post("/api/extension/status", (req: Request, res: Response) => {
            const requestTime = new Date().toISOString();
            const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            try {
                console.log(
                    `[ExtensionStatus] POST /api/extension/status — Request ID: ${requestId} — IP: ${req.ip} — Time: ${requestTime}`
                );
                debug(
                    `ExtensionStatusController => [${req.method}] ${req.originalUrl} — IP: ${
                        req.ip
                    } — Time: ${Date.now()}`
                );

                const body = validatePostQuery(
                    req,
                    res,
                    z.object({
                        status: z.string().optional(),
                        userId: z.string().optional(),
                        roomId: z.string().optional(),
                    })
                );

                if (body === undefined) {
                    console.log(`[ExtensionStatus] Request ${requestId} — Validation failed`);
                    return;
                }

                const { status, userId, roomId } = body;

                // Log the status for debugging
                console.log(
                    `[ExtensionStatus] Request ${requestId} — Status received: "${status}" — User: ${userId} — Room: ${roomId}`
                );
                debug(`Extension status received: ${status} for user ${userId} in room ${roomId}`);

                const responseData = {
                    success: true,
                    received: {
                        status: status || null,
                        userId: userId || null,
                        roomId: roomId || null,
                        timestamp: Date.now(),
                    },
                };

                console.log(`[ExtensionStatus] Request ${requestId} — Sending response:`, JSON.stringify(responseData));

                // Here you can process the status if needed
                // For example, you could store it in a database, broadcast it to other users, etc.
                // For now, we just acknowledge receipt

                res.status(200).json(responseData);
            } catch (error) {
                console.error(`[ExtensionStatus] Request ${requestId} — Error:`, error);
                Sentry.captureException(error);
                res.status(500).json({ error: "Internal server error" });
            }
        });

        /**
         * GET /api/extension/status
         * Endpoint to check if extension status polling is available
         */
        this.app.get("/api/extension/status", (req: Request, res: Response) => {
            const requestTime = new Date().toISOString();
            const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            console.log(
                `[ExtensionStatus] GET /api/extension/status — Request ID: ${requestId} — IP: ${req.ip} — Time: ${requestTime}`
            );
            debug(
                `ExtensionStatusController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`
            );

            const responseData = {
                available: true,
                endpoint: "/api/extension/status",
                method: "POST",
            };

            console.log(`[ExtensionStatus] Request ${requestId} — Sending response:`, JSON.stringify(responseData));

            res.status(200).json(responseData);
        });
    }
}
