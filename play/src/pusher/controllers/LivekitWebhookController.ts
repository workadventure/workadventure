import type { Application, Request, Response } from "express";
import express from "express";
import { LivekitWebhookHttpError, LivekitWebhookService } from "../services/LivekitWebhookService";
import { BaseHttpController } from "./BaseHttpController";

export class LivekitWebhookController extends BaseHttpController {
    constructor(app: Application, private readonly livekitWebhookService = new LivekitWebhookService()) {
        super(app);
    }

    routes(): void {
        this.app.post(
            "/livekit/egress/webhook",
            express.raw({ type: "application/webhook+json" }),
            async (req: Request, res: Response) => {
                const authHeader = req.header("authorization") ?? req.header("Authorize") ?? undefined;
                const spaceName = this.getSpaceName(req);
                const recordingSessionId = this.getRecordingSessionId(req);
                const body = req.body as Buffer;

                try {
                    await this.livekitWebhookService.handleWebhook(body, authHeader, spaceName, recordingSessionId);
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

    private getSpaceName(req: Request): string | undefined {
        const { space } = req.query;
        if (Array.isArray(space)) {
            return undefined;
        }

        return typeof space === "string" ? space : undefined;
    }

    private getRecordingSessionId(req: Request): string | undefined {
        const { recordingSessionId } = req.query;
        if (Array.isArray(recordingSessionId)) {
            return undefined;
        }

        return typeof recordingSessionId === "string" ? recordingSessionId : undefined;
    }
}
