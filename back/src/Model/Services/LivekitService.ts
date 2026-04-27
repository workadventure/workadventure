import crypto from "crypto";
import { HandleRecordingWebhookRequest, RecordingWebhookPhase, type SpaceUser } from "@workadventure/messages";
import {
    RoomServiceClient,
    AccessToken,
    TrackSource,
    EgressClient,
    EgressStatus,
    WebhookReceiver,
    EncodedFileOutput,
    S3Upload,
    EncodedFileType,
    ImageOutput,
    WebhookConfig,
} from "livekit-server-sdk";
import type { CreateOptions, EgressInfo, EncodedOutputs, WebhookEvent } from "livekit-server-sdk";
import * as Sentry from "@sentry/node";
import {
    LIVEKIT_RECORDING_S3_ENDPOINT,
    LIVEKIT_RECORDING_S3_BUCKET,
    LIVEKIT_RECORDING_S3_ACCESS_KEY,
    LIVEKIT_RECORDING_S3_SECRET_KEY,
    LIVEKIT_RECORDING_S3_REGION,
} from "../../Enum/EnvironmentVariable";

const defaultRoomServiceClient = (livekitHost: string, livekitApiKey: string, livekitApiSecret: string) =>
    new RoomServiceClient(livekitHost, livekitApiKey, livekitApiSecret);

const defaultEgressClient = (livekitHost: string, livekitApiKey: string, livekitApiSecret: string) =>
    new EgressClient(livekitHost, livekitApiKey, livekitApiSecret);

const TERMINAL_EGRESS_STATUSES = new Set<EgressStatus>([
    EgressStatus.EGRESS_COMPLETE,
    EgressStatus.EGRESS_FAILED,
    EgressStatus.EGRESS_ABORTED,
    EgressStatus.EGRESS_LIMIT_REACHED,
]);

const TERMINAL_EGRESS_STATUS_NAMES = ["EGRESS_COMPLETE", "EGRESS_FAILED", "EGRESS_ABORTED", "EGRESS_LIMIT_REACHED"];

type LivekitErrorLike = Error & {
    code?: string;
    status?: number;
    metadata?: Record<string, string>;
};

type EgressToStop = {
    egressId: string;
    status?: EgressStatus;
};

type ForwardedWebhookEvent = Extract<WebhookEvent["event"], "egress_started" | "egress_ended">;

type WebhookReceiverLike = Pick<WebhookReceiver, "receive">;

type CreateWebhookReceiver = (apiKey: string, apiSecret: string) => WebhookReceiverLike;

export interface RecordingStartInfo {
    egressId: string;
    roomName: string;
}

export class LivekitWebhookError extends Error {
    constructor(message: string, public readonly kind: "bad-request" | "unauthorized") {
        super(message);
    }
}

export function getLivekitRoomName(roomName: string): string {
    return roomName.length > 250
        ? crypto.createHash("sha256").update(roomName).digest("hex").substring(0, 250)
        : roomName;
}

export class LiveKitService {
    private roomServiceClient: RoomServiceClient;
    private egressClient: EgressClient;
    private readonly webhookReceiver: WebhookReceiverLike;
    private readonly activeRecordings = new Map<string, EgressInfo>();

    constructor(
        private livekitHost: string,
        private livekitApiKey: string,
        private livekitApiSecret: string,
        private livekitFrontendUrl: string,
        private recordingWebhookBaseUrl: string,
        createRoomServiceClient: (
            livekitHost: string,
            livekitApiKey: string,
            livekitApiSecret: string
        ) => RoomServiceClient = defaultRoomServiceClient,
        createEgressClient: (
            livekitHost: string,
            livekitApiKey: string,
            livekitApiSecret: string
        ) => EgressClient = defaultEgressClient,
        createWebhookReceiver: CreateWebhookReceiver = (apiKey, apiSecret) => new WebhookReceiver(apiKey, apiSecret)
    ) {
        if (!this.livekitHost || !this.livekitApiKey || !this.livekitApiSecret) {
            throw new Error("Livekit host, api key or secret is not set");
        }
        this.roomServiceClient = createRoomServiceClient(this.livekitHost, this.livekitApiKey, this.livekitApiSecret);
        this.egressClient = createEgressClient(this.livekitHost, this.livekitApiKey, this.livekitApiSecret);
        this.webhookReceiver = createWebhookReceiver(this.livekitApiKey, this.livekitApiSecret);
    }

    async createRoom(roomName: string): Promise<void> {
        // First check if the room already exists
        const livekitRoomName = getLivekitRoomName(roomName);
        const rooms = await this.roomServiceClient.listRooms([livekitRoomName]);
        if (rooms && rooms.length > 0) {
            return;
        }

        // Room doesn't exist, create it
        const createOptions: CreateOptions = {
            name: livekitRoomName,
        };

        await this.roomServiceClient.createRoom(createOptions);
    }

    async generateToken(roomName: string, user: SpaceUser): Promise<string> {
        const livekitRoomName = getLivekitRoomName(roomName);

        const token = new AccessToken(this.livekitApiKey, this.livekitApiSecret, {
            identity: this.getParticipantIdentity(user.spaceUserId),
            name: user.name,
            metadata: JSON.stringify({
                userId: user.spaceUserId,
                uuid: user.uuid,
            }),
        });

        token.addGrant({
            room: livekitRoomName,
            // Note: everyone can publish in Livekit, moderation is handled at application level. If a user should
            // not have published, its VideoBox will never be visible by anyone anyway.
            canPublish: true,
            canSubscribe: true,
            roomJoin: true,
            canPublishSources: [
                TrackSource.CAMERA,
                TrackSource.MICROPHONE,
                TrackSource.SCREEN_SHARE,
                TrackSource.SCREEN_SHARE_AUDIO,
            ],
        });
        return token.toJwt();
    }

    async deleteRoom(roomName: string): Promise<void> {
        try {
            await this.roomServiceClient.deleteRoom(getLivekitRoomName(roomName));
        } catch (error) {
            console.error(`Error deleting room ${roomName}:`, error);
            // Comment this out to avoid spamming Sentry with errors when rooms are deleted
            // Sentry.captureException(error);
        }
    }

    private getParticipantIdentity(participantName: string): string {
        return participantName;
    }

    getLivekitFrontendUrl(): string {
        if (!this.livekitFrontendUrl) {
            throw new Error("Livekit frontend URL is not set");
        }
        return this.livekitFrontendUrl;
    }

    async startRecording(
        roomName: string,
        user: SpaceUser,
        folderName: string,
        recordingSessionId: string,
        layout = "grid"
    ): Promise<RecordingStartInfo> {
        try {
            const livekitRoomName = getLivekitRoomName(roomName);

            if (!this.recordingWebhookBaseUrl) {
                throw new Error("Livekit recording webhook base URL is not set");
            }

            const endpoint = LIVEKIT_RECORDING_S3_ENDPOINT;
            const accessKey = LIVEKIT_RECORDING_S3_ACCESS_KEY;
            const secret = LIVEKIT_RECORDING_S3_SECRET_KEY;
            const region = LIVEKIT_RECORDING_S3_REGION;
            const bucket = LIVEKIT_RECORDING_S3_BUCKET;

            const timestamp = new Date().toISOString().slice(0, 19);

            const videoFilepath = `${folderName}/recording-${timestamp}`;
            const thumbnailFilepath = `${folderName}/thumbnail-${timestamp}`;

            const s3Config = new S3Upload({
                endpoint,
                accessKey,
                region,
                secret,
                bucket,
                forcePathStyle: true,
            });
            const videoOutput = new EncodedFileOutput({
                fileType: EncodedFileType.MP4,
                filepath: videoFilepath,
                output: {
                    case: "s3",
                    value: s3Config,
                },
                disableManifest: true,
            });

            const thumbnailOutput = new ImageOutput({
                captureInterval: 10,
                width: 320,
                height: 180,
                filenamePrefix: thumbnailFilepath,
                output: {
                    case: "s3",
                    value: s3Config,
                },
            });

            const outputs: EncodedOutputs = {
                file: videoOutput,
                images: thumbnailOutput,
            };

            const webhookUrl = new URL("/livekit/egress/webhook", this.recordingWebhookBaseUrl);
            webhookUrl.searchParams.set("space", roomName);
            webhookUrl.searchParams.set("recordingSessionId", recordingSessionId);

            const result = await this.egressClient.startRoomCompositeEgress(livekitRoomName, outputs, {
                layout,
                webhooks: [new WebhookConfig({ url: webhookUrl.toString(), signingKey: this.livekitApiKey })],
            });

            this.activeRecordings.set(result.egressId, result);
            return {
                egressId: result.egressId,
                roomName: result.roomName,
            };
        } catch (error) {
            console.error("Error starting recording:", error);
            Sentry.captureException(error);
            throw new Error("Failed to start recording", { cause: error });
        }
    }

    async stopRecording(egressId?: string): Promise<void> {
        const recording = this.resolveRecordingToStop(egressId);
        if (!recording) {
            console.warn("No recording to stop");
            return;
        }

        const recordingEgressId = recording.egressId;
        if (this.isTerminalEgressStatus(recording.status)) {
            this.activeRecordings.delete(recordingEgressId);
            return;
        }

        try {
            await this.egressClient.stopEgress(recordingEgressId);
            this.activeRecordings.delete(recordingEgressId);
        } catch (error) {
            if (this.isAlreadyStoppedEgressError(error)) {
                this.activeRecordings.delete(recordingEgressId);
                return;
            }
            throw error;
        }
    }

    async handleLivekitWebhook(
        rawBody: Buffer | Uint8Array,
        authHeader: string | undefined,
        spaceName: string,
        recordingSessionId: string
    ): Promise<HandleRecordingWebhookRequest | "ignored"> {
        if (rawBody.length === 0) {
            throw new LivekitWebhookError("Missing webhook body", "bad-request");
        }

        const event = await this.receiveWebhook(rawBody, authHeader);
        if (!this.isForwardedEvent(event.event)) {
            return "ignored";
        }

        const egressInfo = event.egressInfo;
        if (!egressInfo?.egressId || !egressInfo.roomName) {
            throw new LivekitWebhookError("Missing egress information in webhook payload", "bad-request");
        }

        return HandleRecordingWebhookRequest.fromPartial({
            spaceName,
            eventId: event.id,
            recordingSessionId,
            egressId: egressInfo.egressId,
            roomName: egressInfo.roomName,
            phase: this.toWebhookPhase(event.event),
            status: this.toStatusName(egressInfo.status),
            error: egressInfo.error,
            createdAt: Number(event.createdAt),
        });
    }

    private async receiveWebhook(rawBody: Buffer | Uint8Array, authHeader: string | undefined): Promise<WebhookEvent> {
        try {
            return await this.webhookReceiver.receive(Buffer.from(rawBody).toString("utf-8"), authHeader);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Invalid LiveKit webhook";
            if (
                message.includes("authorization header") ||
                message.includes("sha256 checksum") ||
                message.includes("invalid JWT") ||
                message.includes("could not verify")
            ) {
                throw new LivekitWebhookError(message, "unauthorized");
            }
            throw new LivekitWebhookError(message, "bad-request");
        }
    }

    private isForwardedEvent(eventName: WebhookEvent["event"]): eventName is ForwardedWebhookEvent {
        return eventName === "egress_started" || eventName === "egress_ended";
    }

    private toWebhookPhase(eventName: ForwardedWebhookEvent): RecordingWebhookPhase {
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

    private resolveRecordingToStop(egressId?: string): EgressToStop | undefined {
        if (egressId) {
            const trackedRecording = this.activeRecordings.get(egressId);
            if (trackedRecording) {
                return trackedRecording;
            }

            return {
                egressId,
                status: undefined,
            };
        }

        if (this.activeRecordings.size === 1) {
            return this.activeRecordings.values().next().value;
        }

        if (this.activeRecordings.size > 1) {
            throw new Error("Multiple active recordings found; egressId is required to stop a specific recording");
        }

        return undefined;
    }

    private isTerminalEgressStatus(status: EgressStatus | undefined): boolean {
        return status !== undefined && TERMINAL_EGRESS_STATUSES.has(status);
    }

    private isAlreadyStoppedEgressError(error: unknown): error is LivekitErrorLike {
        if (!(error instanceof Error)) {
            return false;
        }

        const message = error.message.toUpperCase();
        return TERMINAL_EGRESS_STATUS_NAMES.some((status) => message.includes(status));
    }
}
