import type { Application, Request, Response } from "express";
import express from "express";
import Debug from "debug";
import { z } from "zod";
import { LivekitWebhookHttpError, LivekitWebhookService } from "../services/LivekitWebhookService";
import { validateQuery } from "../services/QueryValidator";
import { BaseHttpController } from "./BaseHttpController";

const debug = Debug("pusher:requests");

const livekitWebhookQuerySchema = z.object({
    space: z.string().min(1),
    recordingSessionId: z.string().min(1),
});

function debugWebhookResponse(
    req: Request,
    statusCode: number,
    outcome: string,
    space?: string,
    recordingSessionId?: string
): void {
    debug(
        `LivekitWebhookController <= [${req.method}] ${
            req.originalUrl
        } - Status: ${statusCode} - Outcome: ${outcome} - Space: ${space ?? "unknown"} - Recording session: ${
            recordingSessionId ?? "unknown"
        } - Time: ${Date.now()}`
    );
}

export class LivekitWebhookController extends BaseHttpController {
    constructor(app: Application, private readonly livekitWebhookService = new LivekitWebhookService()) {
        super(app);
    }

    routes(): void {
        this.app.post(
            "/livekit/egress/webhook",
            // Keep the original bytes intact; the back verifies the LiveKit signature against this exact payload.
            express.raw({ type: "application/webhook+json" }),
            async (req: Request, res: Response) => {
                debug(
                    `LivekitWebhookController => [${req.method}] ${req.originalUrl} - IP: ${req.ip} - Body bytes: ${
                        Buffer.isBuffer(req.body) ? req.body.length : 0
                    } - Time: ${Date.now()}`
                );

                const query = validateQuery(req, res, livekitWebhookQuerySchema);
                if (query === undefined) {
                    debugWebhookResponse(req, 400, "invalid-query");
                    return;
                }

                const authHeader = req.header("authorization") ?? req.header("Authorize") ?? undefined;
                const body = req.body as Buffer;

                try {
                    await this.livekitWebhookService.handleWebhook(
                        body,
                        authHeader,
                        query.space,
                        query.recordingSessionId
                    );
                    // The back only returns successfully once the webhook is processed or intentionally ignored.
                    debugWebhookResponse(req, 204, "forwarded", query.space, query.recordingSessionId);
                    res.status(204).end();
                } catch (error) {
                    if (error instanceof LivekitWebhookHttpError) {
                        // Permanent webhook failures use 4xx; unexpected back/transport failures use 500 so LiveKit retries.
                        debugWebhookResponse(
                            req,
                            error.statusCode,
                            "webhook-error",
                            query.space,
                            query.recordingSessionId
                        );
                        res.status(error.statusCode).send(error.message);
                        return;
                    }

                    console.error("Unexpected error while handling LiveKit webhook", error);
                    debugWebhookResponse(req, 500, "unexpected-error", query.space, query.recordingSessionId);
                    res.status(500).send("Internal Server Error");
                }
            }
        );
    }
}
