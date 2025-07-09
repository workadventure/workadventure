import { SpaceUser } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { IRecordableStrategy } from "../Interfaces/ICommunicationStrategy";
import { LiveKitService } from "../Services/LivekitService";
export class LivekitCommunicationStrategy implements ICommunicationStrategy {
    private usersReady: string[] = [];

export class LivekitCommunicationStrategy implements IRecordableStrategy {
    private usersReady: Set<string> = new Set();

    constructor(private space: ICommunicationSpace, private livekitService = new LiveKitService()) {
        this.livekitService.createRoom(this.space.getSpaceName()).catch((error) => {
            console.error(`Error creating room ${this.space.getSpaceName()} on Livekit:`, error);
            Sentry.captureException(error);
        });
    }

    addUser(user: SpaceUser, switchInProgress = false): void {
        this.livekitService
            .generateToken(this.space.getSpaceName(), user)
            .then((token) => {
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
                            },
                        },
                    },
                });
            })
            .catch((error) => {
                console.error(`Error generating token for user ${user.spaceUserId} in Livekit:`, error);
                Sentry.captureException(error);
            });
    }

    deleteUser(user: SpaceUser): void {
        this.livekitService
            .removeParticipant(this.space.getSpaceName(), user.name)
            .catch((error) => {
                console.error(`Error removing participant ${user.name} from Livekit:`, error);
                Sentry.captureException(error);
            })
            .finally(() => {
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
            });
    }

    updateUser(user: SpaceUser): void {}

    initialize(readyUsers: Set<string>): void {
        const users = this.space.getAllUsers().filter((user) => !readyUsers.has(user.spaceUserId));
        users.forEach((user) => {
            this.addUser(user, false);
        });
    }

    addUserReady(userId: string): void {
        this.usersReady.push(userId);
    }

    canSwitch(): boolean {
        return this.usersReady.size === this.space.getAllUsers().length;
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
    async startRecording(): Promise<void> {
        await this.livekitService.startRecording(this.space.getSpaceName());
    }
    async stopRecording(): Promise<void> {
        await this.livekitService.stopRecording();
    }
}
