import { LivekitTokenType, SpaceUser } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import { asError } from "catch-unknown";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { IRecordableStrategy } from "../Interfaces/ICommunicationStrategy";
import { LiveKitService } from "../Services/LivekitService";

export class LivekitCommunicationStrategy implements IRecordableStrategy {
    private usersReady: Set<string> = new Set();

    constructor(private space: ICommunicationSpace, private livekitService: LiveKitService) {
        this.livekitService.createRoom(this.space.getSpaceName()).catch((error) => {
            console.error(`Error creating room ${this.space.getSpaceName()} on Livekit:`, error);
            Sentry.captureException(error);
        });
    }

    public static async create(space: ICommunicationSpace, livekitService: LiveKitService) {
        await livekitService.createRoom(space.getSpaceName());
        return new LivekitCommunicationStrategy(space, livekitService);
    }
    addUser(user: SpaceUser, switchInProgress = false): void {
        //TODO : passer en async
        this.sendLivekitInvitationMessage(user, LivekitTokenType.STREAMER, switchInProgress).catch((error) => {
            console.error(`Error generating token for user ${user.spaceUserId} in Livekit:`, error);
            Sentry.captureException(error);
        });
    }
    private async deleteUserFromLivekit(user: SpaceUser, tokenType: LivekitTokenType): Promise<void> {
        try {
            await this.livekitService.removeParticipant(this.space.getSpaceName(), user.name, tokenType);
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
                        livekitDisconnectMessage: {
                            tokenType: tokenType,
                        },
                    },
                },
            });
        } catch (error) {
            console.error(`Error dispatching livekitDisconnectMessage for user ${user.spaceUserId}:`, error);
            Sentry.captureException(error);
        }
    }

    deleteUser(user: SpaceUser): void {
        this.deleteUserFromLivekit(user, LivekitTokenType.STREAMER).catch((error) => {
            console.error(`Error deleting user ${user.name} from Livekit:`, error);
            Sentry.captureException(error);
        });
    }

    updateUser(user: SpaceUser): void {}

    initialize(readyUsers: Set<string>): void {
        const users = this.space.getUsersInFilter().filter((user) => !readyUsers.has(user.spaceUserId));
        users.forEach((user) => {
            this.addUser(user, false);
        });

        const usersToNotify = this.space.getUsersToNotify().filter((user) => !readyUsers.has(user.spaceUserId));
        usersToNotify.forEach((user) => {
            this.addUserToNotify(user, false);
        });
    }

    addUserReady(userId: string): void {
        this.usersReady.add(userId);
    }

    canSwitch(): boolean {
        return this.usersReady.size === this.space.getAllUsers().length;
    }

    addUserToNotify(user: SpaceUser, switchInProgress = false): void {
        this.sendLivekitInvitationMessage(user, LivekitTokenType.WATCHER, switchInProgress).catch((error) => {
            console.error(`Error generating token for user ${user.spaceUserId} in Livekit:`, error);
            Sentry.captureException(error);
        });
    }

    deleteUserFromNotify(user: SpaceUser): void {
        this.deleteUserFromLivekit(user, LivekitTokenType.WATCHER).catch((error) => {
            console.error(`Error deleting user ${user.name} from Livekit:`, error);
            Sentry.captureException(error);
        });
    }

    private async sendLivekitInvitationMessage(
        user: SpaceUser,
        tokenType: LivekitTokenType,
        switchInProgress = false
    ): Promise<void> {
        const token = await this.livekitService.generateToken(this.space.getSpaceName(), user, tokenType);

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
                        shouldJoinRoomImmediately: !switchInProgress,
                        tokenType,
                    },
                },
            },
        });
    }

    cleanup(): void {
        const users = this.space.getAllUsers();
        users.forEach((user) => {
            this.deleteUser(user);
        });
        this.livekitService.deleteRoom(this.space.getSpaceName()).catch((error) => {
            console.error(error);
            Sentry.captureException(error);
        });
    }
    async startRecording(user: SpaceUser, userUuid: string): Promise<void> {
        try {
            await this.livekitService.startRecording(this.space.getSpaceName(), user, userUuid);
        } catch (e) {
            throw asError(e);
        }
    }
    async stopRecording(): Promise<void> {
        await this.livekitService.stopRecording();
    }
}
