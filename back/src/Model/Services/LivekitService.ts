import { LivekitTokenType, SpaceUser } from "@workadventure/messages";
import {
    RoomServiceClient,
    AccessToken,
    CreateOptions,
    TrackSource,
    EgressClient,
    EncodedFileOutput,
    EgressInfo,
    S3Upload,
    EncodedFileType,
    ImageOutput,
    EncodedOutputs,
} from "livekit-server-sdk";
import * as Sentry from "@sentry/node";
import Debug from "debug";
import {
    LIVEKIT_WS_URL,
    LIVEKIT_API_SECRET,
    LIVEKIT_API_KEY,
    LIVEKIT_HOST,
    LIVEKIT_RECORDING_S3_ENDPOINT,
    LIVEKIT_RECORDING_S3_BUCKET,
    LIVEKIT_RECORDING_S3_ACCESS_KEY,
    LIVEKIT_RECORDING_S3_SECRET_KEY,
    LIVEKIT_RECORDING_S3_REGION,
} from "../../Enum/EnvironmentVariable";

const debug = Debug("livekit");

const defaultRoomServiceClient = (livekitHost: string, livekitApiKey: string, livekitApiSecret: string) =>
    new RoomServiceClient(livekitHost, livekitApiKey, livekitApiSecret);

const defaultEgressClient = (livekitHost: string, livekitApiKey: string, livekitApiSecret: string) =>
    new EgressClient(livekitHost, livekitApiKey, livekitApiSecret);

export class LiveKitService {
    private roomServiceClient: RoomServiceClient;
    private egressClient: EgressClient;
    private currentRecordingInformation: EgressInfo | null = null;

    constructor(
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
        private livekitHost = LIVEKIT_HOST,
        private livekitApiKey = LIVEKIT_API_KEY,
        private livekitApiSecret = LIVEKIT_API_SECRET,
        private livekitFrontendUrl = LIVEKIT_WS_URL
    ) {
        if (!this.livekitHost || !this.livekitApiKey || !this.livekitApiSecret) {
            debug("Livekit host, api key or secret is not set");
            throw new Error("Livekit host, api key or secret is not set");
        }
        this.roomServiceClient = createRoomServiceClient(this.livekitHost, this.livekitApiKey, this.livekitApiSecret);
        this.egressClient = createEgressClient(this.livekitHost, this.livekitApiKey, this.livekitApiSecret);
    }

    async createRoom(roomName: string): Promise<void> {
        const createOptions: CreateOptions = {
            name: roomName,
            emptyTimeout: 5 * 60 * 1000,
            //maxParticipants: 1000,
            departureTimeout: 5 * 60 * 1000,
        };

        await this.roomServiceClient.createRoom(createOptions);
    }

    async generateToken(roomName: string, user: SpaceUser, tokenType: LivekitTokenType): Promise<string> {
        const token = new AccessToken(this.livekitApiKey, this.livekitApiSecret, {
            identity: this.getParticipantIdentity(user.spaceUserId, tokenType),
            name: user.name,
            metadata: JSON.stringify({
                userId: user.spaceUserId,
                uuid: user.uuid,
            }),
        });

        token.addGrant({
            room: roomName,
            canPublish: tokenType === LivekitTokenType.STREAMER,
            canSubscribe: tokenType === LivekitTokenType.WATCHER,
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
            await this.roomServiceClient.deleteRoom(roomName);
        } catch (error) {
            console.error(`Error deleting room ${roomName}:`, error);
            Sentry.captureException(error);
        }
    }

    private getParticipantIdentity(participantName: string, tokenType: LivekitTokenType): string {
        return participantName + "@" + (tokenType === LivekitTokenType.STREAMER ? "STREAMER" : "WATCHER");
    }

    async removeParticipant(roomName: string, participantName: string, tokenType: LivekitTokenType): Promise<void> {
        try {
            const rooms = await this.roomServiceClient.listRooms([roomName]);

            if (rooms && rooms.length > 0) {
                const participants = await this.roomServiceClient.listParticipants(roomName);
                const participantExists = participants.some(
                    (p) => p.identity === this.getParticipantIdentity(participantName, tokenType)
                );

                if (!participantExists) {
                    console.warn(`Participant ${participantName} not found in room ${roomName}`);
                    return;
                }
            } else {
                console.warn(`Room ${roomName} not found`);
                return;
            }
            await this.roomServiceClient.removeParticipant(roomName, participantName);
        } catch (error) {
            console.error(`Error removing participant ${participantName} from room ${roomName}:`, error);
            Sentry.captureException(error);
        }
    }

    getLivekitFrontendUrl(): string {
        if (!this.livekitFrontendUrl) {
            throw new Error("Livekit frontend URL is not set");
        }
        return this.livekitFrontendUrl;
    }

    async startRecording(roomName: string, user: SpaceUser, folderName: string, layout = "grid"): Promise<void> {
        try {
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

            const result = await this.egressClient.startRoomCompositeEgress(roomName, outputs, {
                layout,
            });

            this.currentRecordingInformation = result;
        } catch (error) {
            Sentry.captureException(error);
            throw new Error("Failed to start recording");
        }
    }

    async stopRecording(): Promise<void> {
        if (!this.currentRecordingInformation) {
            console.warn("No recording to stop");
            return;
        }
        await this.egressClient.stopEgress(this.currentRecordingInformation.egressId);
        this.currentRecordingInformation = null;
    }
}
