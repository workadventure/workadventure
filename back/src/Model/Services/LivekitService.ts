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
} from "livekit-server-sdk";
import * as Sentry from "@sentry/node";
import Debug from "debug";

const debug = Debug("LivekitService");

const defaultRoomServiceClient = (livekitHost: string, livekitApiKey: string, livekitApiSecret: string) =>
    new RoomServiceClient(livekitHost, livekitApiKey, livekitApiSecret);
const defaultEgressClient = (livekitHost: string, livekitApiKey: string, livekitApiSecret: string) =>
    new EgressClient(livekitHost, livekitApiKey, livekitApiSecret);
export class LiveKitService {
    private roomServiceClient: RoomServiceClient;
    private egressClient: EgressClient;
    constructor(
        private livekitHost: string,
        private livekitApiKey: string,
        private livekitApiSecret: string,
        private livekitFrontendUrl: string,
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
            debug("Livekit host, api key or secret is not set");
            throw new Error("Livekit host, api key or secret is not set");
        }
        this.roomServiceClient = createRoomServiceClient(this.livekitHost, this.livekitApiKey, this.livekitApiSecret);
        this.egressClient = createEgressClient(this.livekitHost, this.livekitApiKey, this.livekitApiSecret);
    }

    private currentRecordingInformation: EgressInfo | null = null;

    async createRoom(roomName: string): Promise<void> {
        try {
            // First check if the room already exists
            const rooms = await this.roomServiceClient.listRooms([roomName]);
            if (rooms && rooms.length > 0) {
                return;
            }

            // Room doesn't exist, create it
            const createOptions: CreateOptions = {
                name: roomName,
                emptyTimeout: 5 * 60 * 1000,
                //maxParticipants: 1000,
                departureTimeout: 5 * 60 * 1000,
            };

            await this.roomServiceClient.createRoom(createOptions);
        } catch (error) {
            console.error(`LivekitService.createRoom: Error creating room ${roomName}:`, error);
            Sentry.captureException(error);
            // Re-throw the error to be handled by the caller
            throw error;
        }
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
            // if(this.currentRecordingInformation) {
            //     this.stopRecording();
            // }
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
                console.log(
                    `LivekitService.removeParticipant: Room ${roomName} found, checking for participant ${participantName}`
                );
                const participants = await this.roomServiceClient.listParticipants(roomName);
                const participantExists = participants.some(
                    (p) => p.identity === this.getParticipantIdentity(participantName, tokenType)
                );

                if (!participantExists) {
                    console.warn(
                        `LivekitService.removeParticipant: Participant ${participantName} not found in room ${roomName}`
                    );
                    return;
                }

                console.log(
                    `LivekitService.removeParticipant: Participant ${participantName} found in room ${roomName}, removing...`
                );
            } else {
                console.warn(`LivekitService.removeParticipant: Room ${roomName} not found`);
                return;
            }
            await this.roomServiceClient.removeParticipant(roomName, participantName);
            console.log(
                `LivekitService.removeParticipant: Successfully removed participant ${participantName} from room ${roomName}`
            );
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

    async startRecording(roomName: string, layout = "grid"): Promise<void> {
        try {
            //TODO : use env variable / voir si on utilise toujours un S3
            const endpoint = "http://minio-livekit:9000";
            const accessKey = "minio-access-key";
            const secret = "minio-secret-access-key";
            const region = "eu-west-1";
            const bucket = "livekit-recording";
            const filepath = `out/test-${new Date().toISOString().slice(0, 19)}`;

            const output = new EncodedFileOutput({
                fileType: EncodedFileType.MP4,
                filepath,
                output: {
                    case: "s3",
                    value: new S3Upload({
                        endpoint,
                        accessKey,
                        region,
                        secret,
                        bucket,
                        forcePathStyle: true,
                    }),
                },
                disableManifest: true,
            });

            this.currentRecordingInformation = await this.egressClient.startRoomCompositeEgress(
                roomName,
                {
                    file: output,
                },
                {
                    layout,
                }
            );

            // Stop recording after 60 seconds
            // setTimeout(async () => {
            //     try {
            //          await this.stopRecording();
            //     } catch (error) {
            //         console.error('Failed to auto-stop recording after 10 seconds:', error);
            //         Sentry.captureException(error);
            //     }
            // }, 60000);
        } catch (error) {
            console.error("Failed to start recording:", error);
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
