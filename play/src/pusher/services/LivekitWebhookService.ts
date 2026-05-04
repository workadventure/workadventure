import { Metadata, status, type ServiceError } from "@grpc/grpc-js";
import { HandleLivekitWebhookRequest } from "@workadventure/messages";
import type { SpaceManagerClient } from "@workadventure/messages/src/ts-proto-generated/services";
import { GRPC_MAX_MESSAGE_SIZE } from "../enums/EnvironmentVariable";
import { apiClientRepository } from "./ApiClientRepository";

type SpaceManagerClientLike = Pick<SpaceManagerClient, "handleLivekitWebhook">;

type ApiClientRepositoryLike = {
    getSpaceClient(spaceName: string, grpcMaxMessageSize: number): Promise<SpaceManagerClientLike>;
};

export class LivekitWebhookHttpError extends Error {
    constructor(message: string, public readonly statusCode: number) {
        super(message);
    }
}

export class LivekitWebhookService {
    constructor(
        private readonly _apiClientRepository: ApiClientRepositoryLike = apiClientRepository,
        private readonly _grpcMaxMessageSize = GRPC_MAX_MESSAGE_SIZE
    ) {}

    async handleWebhook(
        rawBody: Buffer,
        authHeader: string | undefined,
        spaceName: string,
        recordingSessionId: string
    ): Promise<"forwarded"> {
        if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
            throw new LivekitWebhookHttpError("Missing webhook body", 400);
        }

        const request = HandleLivekitWebhookRequest.fromPartial({
            spaceName,
            recordingSessionId,
            rawBody,
            authorizationHeader: authHeader ?? "",
        });

        const client = await this._apiClientRepository.getSpaceClient(spaceName, this._grpcMaxMessageSize);
        await new Promise<void>((resolve, reject) => {
            client.handleLivekitWebhook(request, new Metadata(), (error) => {
                if (error) {
                    reject(this.toHttpError(error));
                    return;
                }
                resolve();
            });
        });

        return "forwarded";
    }

    private toHttpError(error: ServiceError): LivekitWebhookHttpError {
        // Invalid payloads/signatures are permanent failures, so LiveKit should not retry them.
        if (error.code === status.INVALID_ARGUMENT) {
            return new LivekitWebhookHttpError(error.message, 400);
        }
        if (error.code === status.UNAUTHENTICATED) {
            return new LivekitWebhookHttpError(error.message, 401);
        }

        // Back transport or unexpected processing failures stay retryable for LiveKit.
        return new LivekitWebhookHttpError(error.message, 500);
    }
}
