import crypto from "crypto";
import type { SpaceUser } from "@workadventure/messages";
import type { CreateOptions, EgressInfo, EncodedOutputs } from "livekit-server-sdk";
import {
    RoomServiceClient,
    AccessToken,
    TrackSource,
    EgressClient,
    EgressStatus,
    EncodedFileOutput,
    S3Upload,
    EncodedFileType,
    ImageOutput,
    WebhookConfig,
} from "livekit-server-sdk";
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

export interface RecordingStartInfo {
    egressId: string;
    roomName: string;
}

export function getLivekitRoomName(roomName: string): string {
    return roomName.length > 250
        ? crypto.createHash("sha256").update(roomName).digest("hex").substring(0, 250)
        : roomName;
}

export class LiveKitService {
    private roomServiceClient: RoomServiceClient;
    private egressClient: EgressClient;
    private readonly activeRecordings = new Map<string, EgressInfo>();

    constructor(
        private livekitHost: string,
        private livekitApiKey: string,
        private livekitApiSecret: string,
        private livekitFrontendUrl: string,
        private recordingWebhookBaseUrl: string,
        private recordingWebhookApiKey: string,
        createRoomServiceClient: (
            livekitHost: string,
            livekitApiKey: string,
            livekitApiSecret: string
        ) => RoomServiceClient = defaultRoomServiceClient,
        createEgressClient: (
            livekitHost: string,
            livekitApiKey: string,
            livekitApiSecret: string
        ) => EgressClient = defaultEgressClient
    ) {
        if (!this.livekitHost || !this.livekitApiKey || !this.livekitApiSecret) {
            throw new Error("Livekit host, api key or secret is not set");
        }
        this.roomServiceClient = createRoomServiceClient(this.livekitHost, this.livekitApiKey, this.livekitApiSecret);
        this.egressClient = createEgressClient(this.livekitHost, this.livekitApiKey, this.livekitApiSecret);
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

            if (!this.recordingWebhookApiKey) {
                throw new Error("Livekit recording webhook API key is not set");
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
                // Reusing the main LiveKit API key here keeps the first iteration simple.
                // A dedicated webhook signing key should replace this once deployed.
                webhooks: [new WebhookConfig({ url: webhookUrl.toString(), signingKey: this.recordingWebhookApiKey })],
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
