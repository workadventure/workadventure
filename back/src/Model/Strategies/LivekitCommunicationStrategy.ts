import { SpaceUser } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { ICommunicationStrategy } from "../Interfaces/ICommunicationStrategy";
import { LiveKitService } from "../Services/LivekitService";
export class LivekitCommunicationStrategy implements ICommunicationStrategy {
    //TODO : voir pourquoi array simple et pas set
    private usersReady: string[] = [];

    constructor(private space: ICommunicationSpace, private livekitService: LiveKitService) {
        this.livekitService.createRoom(this.space.getSpaceName()).catch((error) => {
            console.error(`Error creating room ${this.space.getSpaceName()} on Livekit:`, error);
            Sentry.captureException(error);
        });
    }

    //TODO ; voir si on peut integrer une notion de salle d'attente directement dans cette partie
    // avec un salon ouvert / fermé

    addUser(user: SpaceUser, switchInProgress = false): void {
        //console.log(">>> send invitation to addUser", user.spaceUserId, switchInProgress);
        //console.trace(">>> send invitation to addUser");

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

    updateUser(user: SpaceUser): void {
        //TODO : voir si besoin
    }

    initialize(readyUsers: Set<string>): void {
        const users = this.space.getAllUsers().filter((user) => !readyUsers.has(user.spaceUserId));
        console.log(">>> initialize livekit with ", users.length, " users");
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
