import { SpaceUser } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { ICommunicationStrategy } from "../Interfaces/ICommunicationStrategy";
import { LiveKitService } from "../Services/LivekitService";

export class LivekitCommunicationStrategy implements ICommunicationStrategy {
    private usersReady: string[] = [];

    private streamingUsers: Map<string, SpaceUser> = new Map<string, SpaceUser>();
    private receivingUsers: Map<string, SpaceUser> = new Map<string, SpaceUser>();

    constructor(private space: ICommunicationSpace, private livekitService: LiveKitService) {
        this.livekitService.createRoom(this.space.getSpaceName()).catch((error) => {
            console.error(`Error creating room ${this.space.getSpaceName()} on Livekit:`, error);
            Sentry.captureException(error);
        });
    }

    addUser(user: SpaceUser, switchInProgress = false): void {
        console.log("XXXXXXX addUser start", user.spaceUserId);

        //TODO : passer en async

        console.log(
            "XXXXXXX AddUser",
            user.spaceUserId,
            "other users",
            this.space.getUsersToNotify().map((u) => u.spaceUserId)
        );

        if (this.streamingUsers.has(user.spaceUserId)) {
            console.warn("User already streaming in the room", user.spaceUserId);
            Sentry.captureMessage(`User already streaming in the room ${user.spaceUserId}`);
            return;
        }

        this.streamingUsers.set(user.spaceUserId, user);

        // Let's only send the invitation if the user is not already watching the room
        if (!this.receivingUsers.has(user.spaceUserId)) {
            this.sendLivekitInvitationMessage(user, switchInProgress).catch((error) => {
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
        console.log("XXXXXXX deleteUser start", user.spaceUserId);

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
        this.usersReady.push(userId);
    }

    canSwitch(): boolean {
        return this.usersReady.length === this.space.getAllUsers().length;
    }

    addUserToNotify(user: SpaceUser, switchInProgress = false): void {
        console.log("XXXXXXX addUserToNotify start", user.spaceUserId);
        if (this.receivingUsers.has(user.spaceUserId)) {
            console.warn("User already receiving in the room", user.spaceUserId);
            Sentry.captureMessage(`User already receiving in the room ${user.spaceUserId}`);
            return;
        }

        this.receivingUsers.set(user.spaceUserId, user);

        console.log(
            "XXXXXXX addUserToNotify",
            user.spaceUserId,
            "other users",
            this.space.getUsersToNotify().map((u) => u.spaceUserId)
        );

        // Let's only send the invitation if the user is not already streaming in the room
        if (!this.streamingUsers.has(user.spaceUserId)) {
            this.sendLivekitInvitationMessage(user, switchInProgress).catch((error) => {
                console.error(`Error generating token for user ${user.spaceUserId} in Livekit:`, error);
                Sentry.captureException(error);
            });
        }
    }

    deleteUserFromNotify(user: SpaceUser): void {
        console.log("XXXXXXX deleteUserFromNotify start", user.spaceUserId);

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

    private async sendLivekitInvitationMessage(user: SpaceUser, switchInProgress = false): Promise<void> {
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
                        shouldJoinRoomImmediately: !switchInProgress,
                    },
                },
            },
        });
    }

    cleanup(): void {
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
}
