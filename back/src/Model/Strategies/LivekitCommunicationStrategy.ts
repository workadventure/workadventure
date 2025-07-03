import { SpaceUser } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { ICommunicationStrategy } from "../Interfaces/ICommunicationStrategy";
import { LiveKitService } from "../Services/LivekitService";
export class LivekitCommunicationStrategy implements ICommunicationStrategy {
    private usersReady: string[] = [];

    constructor(private space: ICommunicationSpace, private livekitService: LiveKitService) {
        this.livekitService.createRoom(this.space.getSpaceName()).catch((error) => {
            console.error(`Error creating room ${this.space.getSpaceName()} on Livekit:`, error);
            Sentry.captureException(error);
        });
    }

    addUser(user: SpaceUser, switchInProgress = false): void {
        // First ensure the room exists before generating a token
        this.livekitService
            .createRoom(this.space.getSpaceName())
            .then(() => {
                return this.livekitService.generateToken(this.space.getSpaceName(), user);
            })
            .then((token) => {
                // Check if the user is still in the space before sending the invitation
                const userStillInSpace = this.space.getAllUsers().some((u) => u.spaceUserId === user.spaceUserId);
                if (!userStillInSpace) {
                    console.warn(
                        `LivekitCommunicationStrategy.addUser: User ${user.name} (${user.spaceUserId}) is no longer in the space, skipping invitation`
                    );
                    return;
                }

                const serverUrl = this.livekitService.getLivekitFrontendUrl();

                this.space.dispatchPrivateEvent({
                    spaceName: this.space.getSpaceName(),
                    receiverUserId: user.spaceUserId,
                    senderUserId: user.spaceUserId,
                    spaceEvent: {
                        event: {
                            $case: "livekitInvitationMessage",
                            livekitInvitationMessage: {
                                token: token,
                                serverUrl: serverUrl,
                                shouldJoinRoomImmediately: !switchInProgress,
                            },
                        },
                    },
                });
            })
            .catch((error) => {
                console.error(
                    `LivekitCommunicationStrategy.addUser: Error adding user ${user.name} (${user.spaceUserId}) to Livekit:`,
                    error
                );
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
        return this.usersReady.length === this.space.getAllUsers().length;
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
}
