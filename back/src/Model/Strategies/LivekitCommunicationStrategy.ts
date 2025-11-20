import { SpaceUser, PublicEvent } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import Debug from "debug";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { ICommunicationStrategy } from "../Interfaces/ICommunicationStrategy";
import { LiveKitService } from "../Services/LivekitService";
import { LivekitTranscriptionService } from "../Services/LivekitTranscriptionService";

const debug = Debug("LivekitCommunicationStrategy");

export class LivekitCommunicationStrategy implements ICommunicationStrategy {
    private usersReady: string[] = [];
    private createRoomPromise: Promise<void> | null = null;

    private streamingUsers: Map<string, SpaceUser> = new Map<string, SpaceUser>();
    private receivingUsers: Map<string, SpaceUser> = new Map<string, SpaceUser>();
    private transcriptionService: LivekitTranscriptionService | null = null;

    constructor(private space: ICommunicationSpace, private livekitService: LiveKitService) {
        // Initialize transcription service
        this.transcriptionService = this.livekitService.createTranscriptionService(
            this.space,
            this.space.getSpaceName()
        );

        // Register this strategy with the agent service
        const agentService = this.livekitService.getAgentService();
        agentService.registerStrategy(this.space.getSpaceName(), this);
    }

    async addUser(user: SpaceUser): Promise<void> {
        // Check if the user is already streaming
        if (this.streamingUsers.has(user.spaceUserId)) {
            console.warn("User already streaming in the room", user.spaceUserId);
            Sentry.captureMessage(`User already streaming in the room ${user.spaceUserId}`);
            return;
        }

        // Ensure the Livekit room is created (only once)
        if (!this.createRoomPromise) {
            this.createRoomPromise = this.livekitService.createRoom(this.space.getSpaceName());
            
            // Start agent service when first room is created
            this.livekitService.startAgentService().catch((error) => {
                console.error("Error starting agent service:", error);
                Sentry.captureException(error);
            });
        }

        await this.createRoomPromise;

        // Send invitation to all receiving users if this is the first room creation
        if (this.receivingUsers.size > 0 && this.streamingUsers.size === 0) {
            for (const receivingUser of this.receivingUsers.values()) {
                this.sendLivekitInvitationMessage(receivingUser).catch((error) => {
                    console.error(`Error generating token for user ${receivingUser.spaceUserId} in Livekit:`, error);
                    Sentry.captureException(error);
                });
            }
        }
        // Register the user as streaming
        this.streamingUsers.set(user.spaceUserId, user);

        // Send invitation to the new user if not already receiving
        if (!this.receivingUsers.has(user.spaceUserId)) {
            this.sendLivekitInvitationMessage(user).catch((error) => {
                console.error(`Error generating token for user ${user.spaceUserId} in Livekit:`, error);
                Sentry.captureException(error);
            });
        }
    }

    private async deleteUserFromLivekit(user: SpaceUser): Promise<void> {
        try {
            await this.livekitService.removeParticipant(this.space.getSpaceName(), user.name);
        } catch (error) {
            console.error(`Error removing participant ${user.name} from Livekit:`, error);
            Sentry.captureException(error);
        }

        try {
            this.space.dispatchPrivateEvent({
                spaceName: this.space.getSpaceName(),
                receiverUserId: user.spaceUserId,
                senderUserId: user.spaceUserId,
                spaceEvent: {
                    event: {
                        $case: "livekitDisconnectMessage",
                        livekitDisconnectMessage: {},
                    },
                },
            });
        } catch (error) {
            console.error(`Error dispatching livekitDisconnectMessage for user ${user.spaceUserId}:`, error);
            //  Sentry.captureException(error);
        }
    }

    deleteUser(user: SpaceUser): void {
        const deleted = this.streamingUsers.delete(user.spaceUserId);

        if (!deleted) {
            console.warn("User to delete not found in streaming users", user.spaceUserId);
        }

        // Let's only disconnect from Livekit if the user is not watching in the room anymore
        if (!this.receivingUsers.has(user.spaceUserId)) {
            this.deleteUserFromLivekit(user).catch((error) => {
                console.error(`Error deleting user ${user.name} from Livekit:`, error);
                Sentry.captureException(error);
            });
        }

        if (this.streamingUsers.size === 0) {
            this.createRoomPromise = null;
            for (const receivingUser of this.receivingUsers.values()) {
                this.deleteUserFromLivekit(receivingUser).catch((error) => {
                    console.error(`Error deleting user ${receivingUser.name} from Livekit:`, error);
                    Sentry.captureException(error);
                });
            }

            this.livekitService.deleteRoom(this.space.getSpaceName()).catch((error) => {
                console.error(`Error deleting room ${this.space.getSpaceName()} from Livekit:`, error);
                Sentry.captureException(error);
            });
        }
    }

    updateUser(user: SpaceUser): void {}

    initialize(users: ReadonlyMap<string, SpaceUser>, usersToNotify: ReadonlyMap<string, SpaceUser>): void {
        (async () => {
            for (const user of users.values()) {
                // We want to add users sequentially
                // The first user will trigger the room creation (which is async) but for other users, the
                // room will already be created, and the execution will not wait at all.
                // eslint-disable-next-line no-await-in-loop
                await this.addUser(user).catch((error) => {
                    console.error(`Error adding user ${user.spaceUserId} to Livekit:`, error);
                    Sentry.captureException(error);
                });
            }

            for (const user of usersToNotify.values()) {
                // We want to add users sequentially
                // The first user will trigger the room creation (which is async) but for other users, the
                // room will already be created, and the execution will not wait at all.
                // eslint-disable-next-line no-await-in-loop
                await this.addUserToNotify(user).catch((error) => {
                    console.error(`Error adding user ${user.spaceUserId} to Livekit:`, error);
                    Sentry.captureException(error);
                });
            }
        })().catch((error) => {
            console.error("Error initializing LivekitCommunicationStrategy:", error);
            Sentry.captureException(error);
        });
    }

    addUserReady(userId: string): void {
        this.usersReady.push(userId);
    }

    canSwitch(): boolean {
        return this.usersReady.length === this.space.getAllUsers().length;
    }

    async addUserToNotify(user: SpaceUser): Promise<void> {
        if (this.receivingUsers.has(user.spaceUserId)) {
            console.warn("User already receiving in the room", user.spaceUserId);
            Sentry.captureMessage(`User already receiving in the room ${user.spaceUserId}`);
            return Promise.resolve();
        }

        this.receivingUsers.set(user.spaceUserId, user);

        if (!this.createRoomPromise) {
            return Promise.resolve();
        }
        await this.createRoomPromise;

        // Let's only send the invitation if the user is not already streaming in the room
        if (!this.streamingUsers.has(user.spaceUserId)) {
            this.sendLivekitInvitationMessage(user).catch((error) => {
                console.error(`Error generating token for user ${user.spaceUserId} in Livekit:`, error);
                Sentry.captureException(error);
            });
        }

        return Promise.resolve();
    }

    deleteUserFromNotify(user: SpaceUser): void {
        const deleted = this.receivingUsers.delete(user.spaceUserId);
        if (!deleted) {
            console.warn("User to delete not found in receiving users", user.spaceUserId);
        }

        // Let's only disconnect from Livekit if the user is not streaming in the room anymore
        if (!this.streamingUsers.has(user.spaceUserId)) {
            this.deleteUserFromLivekit(user).catch((error) => {
                console.error(`Error deleting user ${user.name} from Livekit:`, error);
                Sentry.captureException(error);
            });
        }
    }

    private async sendLivekitInvitationMessage(user: SpaceUser): Promise<void> {
        const token = await this.livekitService.generateToken(this.space.getSpaceName(), user);

        this.space.dispatchPrivateEvent({
            spaceName: this.space.getSpaceName(),
            receiverUserId: user.spaceUserId,
            senderUserId: user.spaceUserId,
            spaceEvent: {
                event: {
                    $case: "livekitInvitationMessage",
                    livekitInvitationMessage: {
                        token: token,
                        serverUrl: this.livekitService.getLivekitFrontendUrl(),
                    },
                },
            },
        });
    }

    cleanup(): void {
        // Unregister strategy from agent service
        const agentService = this.livekitService.getAgentService();
        agentService.unregisterStrategy(this.space.getSpaceName());

        for (const user of this.streamingUsers.values()) {
            this.deleteUser(user);
        }
        for (const user of this.receivingUsers.values()) {
            this.deleteUserFromNotify(user);
        }
        this.livekitService.deleteRoom(this.space.getSpaceName()).catch((error) => {
            console.error(error);
            Sentry.captureException(error);
        });
    }

    /**
     * Send real-time transcription to all participants via public messages
     */
    sendTranscription(
        text: string,
        participantIdentity: string,
        participantName: string,
        segmentId?: string
    ): void {
        const roomName = this.space.getSpaceName();
        const timestamp = new Date().toISOString();

        console.log(`[Transcription] 📥 Received transcription in room: ${roomName}`);
        console.log(`[Transcription] 👤 Participant: ${participantName} (${participantIdentity})`);
        console.log(`[Transcription] 📝 Text: "${text}"`);
        if (segmentId) {
            console.log(`[Transcription] 🏷️  Segment ID: ${segmentId}`);
        }
        console.log(`[Transcription] ⏰ Timestamp: ${timestamp}`);
        debug(`[${roomName}] Received transcription from ${participantName} (${participantIdentity}): ${text}`);

        if (!this.transcriptionService) {
            console.warn(`[Transcription] ⚠️  Transcription service not initialized for room: ${roomName}`);
            debug(`[${roomName}] Transcription service not initialized`);
            return;
        }

        try {
            // Add transcription to service
            console.log(`[Transcription] 💾 Adding transcription to service for room: ${roomName}`);
            this.transcriptionService.addTranscription(
                text,
                participantIdentity,
                participantName,
                segmentId
            );
            console.log(`[Transcription] ✅ Transcription added to service successfully`);

            // Format the transcription message
            const time = new Date().toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            });

            const message = `**${participantName}** (${time}):\n${text}`;

            console.log(`[Transcription] 📨 Preparing to send transcription to all participants in room: ${roomName}`);
            debug(`[${roomName}] Preparing to send transcription message: ${message.substring(0, 100)}...`);

            // Send to all participants via public event using SpaceMessage
            const publicEvent: PublicEvent = {
                spaceName: roomName,
                senderUserId: "transcription-agent", // Server-side sender
                spaceEvent: {
                    event: {
                        $case: "spaceMessage",
                        spaceMessage: {
                            message: message,
                            characterTextures: [],
                            name: "Transcription",
                        },
                    },
                },
            };

            this.space.dispatchPublicEvent(publicEvent);
            console.log(`[Transcription] ✅ Transcription sent successfully to all participants in room: ${roomName}`);
            debug(`[${roomName}] Transcription dispatched via public event`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[Transcription] ❌ Error processing transcription for room ${roomName}:`, errorMessage);
            console.error(`[Transcription] Error details:`, error);
            debug(`[${roomName}] Error processing transcription:`, error);
            Sentry.captureException(error instanceof Error ? error : new Error(errorMessage));
        }
    }

    /**
     * Generate and display full transcript in Markdown format
     */
    finalizeTranscript(): void {
        const roomName = this.space.getSpaceName();
        console.log(`[Transcription] 🏁 Finalizing transcript for room: ${roomName}`);

        if (!this.transcriptionService) {
            console.warn(`[Transcription] ⚠️  Transcription service not initialized for room: ${roomName}`);
            debug(`[${roomName}] Transcription service not initialized`);
            return;
        }

        try {
            console.log(`[Transcription] 📄 Generating Markdown transcript for room: ${roomName}`);
            const markdown = this.transcriptionService.generateMarkdownTranscript();
            const transcriptLength = markdown.length;
            const lineCount = markdown.split('\n').length;

            console.log(`[Transcription] ✅ Transcript generated: ${transcriptLength} characters, ${lineCount} lines`);

            // Display in back console
            console.log("\n");
            console.log("=".repeat(80));
            console.log(`[Transcription] 📋 FULL TRANSCRIPT FOR ROOM: ${roomName}`);
            console.log("=".repeat(80));
            console.log("\n");
            console.log(markdown);
            console.log("\n");
            console.log("=".repeat(80));
            console.log(`[Transcription] ✅ Transcript finalized for room: ${roomName}`);
            console.log("\n");

            debug(`[${roomName}] Transcript finalized: ${transcriptLength} characters`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[Transcription] ❌ Error finalizing transcript for room ${roomName}:`, errorMessage);
            console.error(`[Transcription] Error details:`, error);
            debug(`[${roomName}] Error finalizing transcript:`, error);
            Sentry.captureException(error instanceof Error ? error : new Error(errorMessage));
        }
    }
}
