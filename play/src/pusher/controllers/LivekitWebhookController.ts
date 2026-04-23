import type { Application, Request, Response } from "express";
import express from "express";
import { z } from "zod";
import { LivekitWebhookHttpError, LivekitWebhookService } from "../services/LivekitWebhookService";
import { validateQuery } from "../services/QueryValidator";
import { BaseHttpController } from "./BaseHttpController";

const livekitWebhookQuerySchema = z.object({
    space: z.string().min(1),
    recordingSessionId: z.string().min(1),
});

export class LivekitWebhookController extends BaseHttpController {
    constructor(app: Application, private readonly livekitWebhookService = new LivekitWebhookService()) {
        super(app);
    }

    routes(): void {
        this.app.post(
            "/livekit/egress/webhook",
            express.raw({ type: "application/webhook+json" }),
            async (req: Request, res: Response) => {
                const query = validateQuery(req, res, livekitWebhookQuerySchema);
                if (query === undefined) {
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
                    res.status(204).end();
                } catch (error) {
                    if (error instanceof LivekitWebhookHttpError) {
                        res.status(error.statusCode).send(error.message);
                        return;
                    }

                    console.error("Unexpected error while handling LiveKit webhook", error);
                    res.status(500).send("Internal Server Error");
                }
            }
        );
    }
}
