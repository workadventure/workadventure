import crypto from "crypto";
import type { SpaceUser } from "@workadventure/messages";
import type { CreateOptions, EgressInfo, EncodedOutputs } from "livekit-server-sdk";
import {
    RoomServiceClient,
    AgentDispatchClient,
    AccessToken,
    TrackSource,
    EgressClient,
    EncodedFileOutput,
    S3Upload,
    EncodedFileType,
    ImageOutput,
} from "livekit-server-sdk";
import * as Sentry from "@sentry/node";
import Debug from "debug";
import {
    LIVEKIT_RECORDING_S3_ENDPOINT,
    LIVEKIT_RECORDING_S3_BUCKET,
    LIVEKIT_RECORDING_S3_ACCESS_KEY,
    LIVEKIT_RECORDING_S3_SECRET_KEY,
    LIVEKIT_RECORDING_S3_REGION,
    LIVEKIT_AGENT_NAME,
} from "../../Enum/EnvironmentVariable";

const debug = Debug("LivekitService");

const defaultRoomServiceClient = (livekitHost: string, livekitApiKey: string, livekitApiSecret: string) =>
    new RoomServiceClient(livekitHost, livekitApiKey, livekitApiSecret);

const defaultAgentDispatchClient = (livekitHost: string, livekitApiKey: string, livekitApiSecret: string) =>
    new AgentDispatchClient(livekitHost, livekitApiKey, livekitApiSecret);

const defaultEgressClient = (livekitHost: string, livekitApiKey: string, livekitApiSecret: string) =>
    new EgressClient(livekitHost, livekitApiKey, livekitApiSecret);

export class LiveKitService {
    private roomServiceClient: RoomServiceClient;
    private agentDispatchClient: AgentDispatchClient;
    private egressClient: EgressClient;
    constructor(
        private livekitHost: string,
        private livekitApiKey: string,
        private livekitApiSecret: string,
        private livekitFrontendUrl: string,
        private livekitAgentName: string = LIVEKIT_AGENT_NAME,
        createRoomServiceClient: (
            livekitHost: string,
            livekitApiKey: string,
            livekitApiSecret: string
        ) => RoomServiceClient = defaultRoomServiceClient,
        createAgentDispatchClient: (
            livekitHost: string,
            livekitApiKey: string,
            livekitApiSecret: string
        ) => AgentDispatchClient = defaultAgentDispatchClient,
        createEgressClient: (
            livekitHost: string,
            livekitApiKey: string,
            livekitApiSecret: string
        ) => EgressClient = defaultEgressClient
    ) {
        if (!this.livekitHost || !this.livekitApiKey || !this.livekitApiSecret) {
            debug("Livekit host, api key or secret is not set");
            throw new Error("Livekit host, api key or secret is not set");
        }
        this.roomServiceClient = createRoomServiceClient(this.livekitHost, this.livekitApiKey, this.livekitApiSecret);
        this.agentDispatchClient = createAgentDispatchClient(
            this.livekitHost,
            this.livekitApiKey,
            this.livekitApiSecret
        );
        this.egressClient = createEgressClient(this.livekitHost, this.livekitApiKey, this.livekitApiSecret);
    }

    private currentRecordingInformation: EgressInfo | null = null;
    private currentTranscriptionDispatch: {
        roomName: string;
        dispatchId: string;
    } | null = null;

    async createRoom(roomName: string): Promise<void> {
        // First check if the room already exists
        const rooms = await this.roomServiceClient.listRooms([roomName]);
        if (rooms && rooms.length > 0) {
            return;
        }

        const hashedRoomName =
            roomName.length > 250
                ? crypto.createHash("sha256").update(roomName).digest("hex").substring(0, 250)
                : roomName;
        // Room doesn't exist, create it
        const createOptions: CreateOptions = {
            name: hashedRoomName,
        };

        await this.roomServiceClient.createRoom(createOptions);
    }

    async generateToken(roomName: string, user: SpaceUser): Promise<string> {
        const hashedRoomName = this.getHashedRoomName(roomName);

        const token = new AccessToken(this.livekitApiKey, this.livekitApiSecret, {
            identity: this.getParticipantIdentity(user.spaceUserId),
            name: user.name,
            metadata: JSON.stringify({
                userId: user.spaceUserId,
                uuid: user.uuid,
            }),
        });

        token.addGrant({
            room: hashedRoomName,
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

    private getHashedRoomName(roomName: string): string {
        return roomName.length > 250
            ? crypto.createHash("sha256").update(roomName).digest("hex").substring(0, 250)
            : roomName;
    }

    async deleteRoom(roomName: string): Promise<void> {
        const hashedRoomName = this.getHashedRoomName(roomName);

        await this.stopTranscriptionDispatch(hashedRoomName);
        try {
            await this.roomServiceClient.deleteRoom(hashedRoomName);
            // if(this.currentRecordingInformation) {
            //     this.stopRecording();
            // }
        } catch (error) {
            console.error(`Error deleting room ${roomName}:`, error);
            Sentry.captureException(error);
        }
    }

    private getParticipantIdentity(participantName: string): string {
        return participantName;
    }

    async removeParticipant(roomName: string, participantName: string): Promise<void> {
        try {
            const rooms = await this.roomServiceClient.listRooms([this.getHashedRoomName(roomName)]);

            if (rooms && rooms.length > 0) {
                const participants = await this.roomServiceClient.listParticipants(this.getHashedRoomName(roomName));
                const participantExists = participants.some(
                    (p) => p.identity === this.getParticipantIdentity(participantName)
                );

                if (!participantExists) {
                    return;
                }
            } else {
                console.warn(`LivekitService.removeParticipant: Room ${roomName} not found`);
                return;
            }
            await this.roomServiceClient.removeParticipant(this.getHashedRoomName(roomName), participantName);
        } catch (error) {
            console.error(
                `LivekitService.removeParticipant: Error removing participant ${participantName} from room ${roomName}:`,
                error
            );
            Sentry.captureException(error);
        }
    }

    getLivekitFrontendUrl(): string {
        if (!this.livekitFrontendUrl) {
            throw new Error("Livekit frontend URL is not set");
        }
        return this.livekitFrontendUrl;
    }

    private async ensureTranscriptionDispatch(roomName: string): Promise<void> {
        const hashedRoomName = this.getHashedRoomName(roomName);

        if (this.currentTranscriptionDispatch?.roomName === hashedRoomName) {
            return;
        }

        const dispatch = await this.agentDispatchClient.createDispatch(hashedRoomName, this.livekitAgentName);
        this.currentTranscriptionDispatch = {
            roomName: hashedRoomName,
            dispatchId: dispatch.id,
        };
    }

    private async stopTranscriptionDispatch(roomName?: string): Promise<void> {
        if (!this.currentTranscriptionDispatch) {
            return;
        }

        if (roomName && this.currentTranscriptionDispatch.roomName !== roomName) {
            return;
        }

        try {
            await this.agentDispatchClient.deleteDispatch(
                this.currentTranscriptionDispatch.dispatchId,
                this.currentTranscriptionDispatch.roomName
            );
        } catch (error) {
            console.error("Error stopping transcription dispatch:", error);
            Sentry.captureException(error);
        } finally {
            this.currentTranscriptionDispatch = null;
        }
    }

    async startRecording(roomName: string, user: SpaceUser, folderName: string, layout = "grid"): Promise<void> {
        try {
            await this.ensureTranscriptionDispatch(roomName);

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

            const result = await this.egressClient.startRoomCompositeEgress(this.getHashedRoomName(roomName), outputs, {
                layout,
            });

            this.currentRecordingInformation = result;
        } catch (error) {
            console.error("Error starting recording:", error);
            Sentry.captureException(error);
            throw new Error("Failed to start recording", { cause: error });
        }
    }

    async stopRecording(): Promise<void> {
        await this.stopTranscriptionDispatch();

        if (!this.currentRecordingInformation) {
            console.warn("No recording to stop");
            return;
        }
        await this.egressClient.stopEgress(this.currentRecordingInformation.egressId);
        this.currentRecordingInformation = null;
    }
}
