import { Metadata } from "@grpc/grpc-js";
import {
    HandleRecordingWebhookRequest,
    RecordingWebhookPhase,
    type HandleRecordingWebhookRequest as HandleRecordingWebhookRequestType,
} from "@workadventure/messages";
import { EgressStatus, WebhookReceiver, type WebhookEvent } from "livekit-server-sdk";
import { GRPC_MAX_MESSAGE_SIZE, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from "../enums/EnvironmentVariable";
import { apiClientRepository } from "./ApiClientRepository";

type ForwardedWebhookEvent = Extract<WebhookEvent["event"], "egress_started" | "egress_ended">;

interface SpaceManagerClientLike {
    handleRecordingWebhook(
        request: HandleRecordingWebhookRequestType,
        metadata: Metadata,
        callback: (error: Error | null) => void
    ): unknown;
}

interface ApiClientRepositoryLike {
    getSpaceClient(spaceName: string, grpcMaxMessageSize: number): Promise<SpaceManagerClientLike>;
}

interface WebhookReceiverLike {
    receive(body: string, authHeader?: string): Promise<WebhookEvent>;
}

type CreateWebhookReceiver = (apiKey: string, apiSecret: string) => WebhookReceiverLike;

export class LivekitWebhookHttpError extends Error {
    constructor(message: string, public readonly statusCode: number) {
        super(message);
    }
}

export class LivekitWebhookService {
    private readonly webhookReceiver?: WebhookReceiverLike;

    constructor(
        private readonly _apiClientRepository: ApiClientRepositoryLike = apiClientRepository,
        private readonly _grpcMaxMessageSize = GRPC_MAX_MESSAGE_SIZE,
        livekitWebhookApiKey = LIVEKIT_API_KEY,
        livekitWebhookApiSecret = LIVEKIT_API_SECRET,
        createWebhookReceiver: CreateWebhookReceiver = (apiKey, apiSecret) => new WebhookReceiver(apiKey, apiSecret)
    ) {
        if (livekitWebhookApiKey && livekitWebhookApiSecret) {
            this.webhookReceiver = createWebhookReceiver(livekitWebhookApiKey, livekitWebhookApiSecret);
        }
    }

    async handleWebhook(
        rawBody: Buffer,
        authHeader: string | undefined,
        spaceName: string | undefined,
        recordingSessionId: string | undefined
    ): Promise<"forwarded" | "ignored"> {
        const webhookReceiver = this.webhookReceiver;
        if (!webhookReceiver) {
            throw new LivekitWebhookHttpError("LiveKit webhook receiver is not configured", 500);
        }

        if (!spaceName) {
            throw new LivekitWebhookHttpError("Missing space query parameter", 400);
        }

        if (!recordingSessionId) {
            throw new LivekitWebhookHttpError("Missing recordingSessionId query parameter", 400);
        }

        if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
            throw new LivekitWebhookHttpError("Missing webhook body", 400);
        }

        const event = await this.receiveWebhook(webhookReceiver, rawBody, authHeader);

        if (!this.isForwardedEvent(event.event)) {
            return "ignored";
        }

        const egressInfo = event.egressInfo;
        if (!egressInfo?.egressId || !egressInfo.roomName) {
            throw new LivekitWebhookHttpError("Missing egress information in webhook payload", 400);
        }

        const request = HandleRecordingWebhookRequest.fromPartial({
            spaceName,
            eventId: event.id,
            recordingSessionId,
            egressId: egressInfo.egressId,
            roomName: egressInfo.roomName,
            phase: this.toPhase(event.event),
            status: this.toStatusName(egressInfo.status),
            error: egressInfo.error,
            createdAt: Number(event.createdAt),
        });

        const client = await this._apiClientRepository.getSpaceClient(spaceName, this._grpcMaxMessageSize);
        await new Promise<void>((resolve, reject) => {
            client.handleRecordingWebhook(request, new Metadata(), (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });

        return "forwarded";
    }

    private async receiveWebhook(
        webhookReceiver: WebhookReceiverLike,
        rawBody: Buffer,
        authHeader: string | undefined
    ): Promise<WebhookEvent> {
        try {
            return await webhookReceiver.receive(rawBody.toString("utf-8"), authHeader);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Invalid LiveKit webhook";
            if (
                message.includes("authorization header") ||
                message.includes("sha256 checksum") ||
                message.includes("invalid JWT") ||
                message.includes("could not verify")
            ) {
                throw new LivekitWebhookHttpError(message, 401);
            }
            throw new LivekitWebhookHttpError(message, 400);
        }
    }

    private isForwardedEvent(eventName: WebhookEvent["event"]): eventName is ForwardedWebhookEvent {
        return eventName === "egress_started" || eventName === "egress_ended";
    }

    private toPhase(eventName: ForwardedWebhookEvent): RecordingWebhookPhase {
        return eventName === "egress_started"
            ? RecordingWebhookPhase.RECORDING_WEBHOOK_PHASE_STARTED
            : RecordingWebhookPhase.RECORDING_WEBHOOK_PHASE_ENDED;
    }

    private toStatusName(status: EgressStatus | undefined): string {
        if (status === undefined) {
            return "";
        }

        return EgressStatus[status] ?? "";
    }
}
