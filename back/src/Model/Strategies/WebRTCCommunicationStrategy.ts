import { FilterType, type SpaceUser, type MeetingConnectionRestartMessage } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import { v4 as uuidv4 } from "uuid";
import type { ICommunicationStrategy } from "../Interfaces/ICommunicationStrategy";
import type { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";

class ConnectionManager {
    private connections: Map<string, Map<string, string>> = new Map();

    addConnection(user1Id: string, user2Id: string, connectionId: string): void {
        this.getOrCreateUserConnections(user1Id).set(user2Id, connectionId);
    }

    removeConnection(user1Id: string, user2Id: string): void {
        this.connections.get(user1Id)?.delete(user2Id);
    }

    hasConnection(user1Id: string, user2Id: string): boolean {
        return this.connections.get(user1Id)?.has(user2Id) ?? false;
    }

    getConnectionId(user1Id: string, user2Id: string): string | undefined {
        return this.connections.get(user1Id)?.get(user2Id);
    }

    removeUser(userId: string): void {
        this.connections.delete(userId);
    }

    removeUserToNotify(userId: string): void {
        for (const connections of this.connections.values()) {
            connections.delete(userId);
        }
    }

    getAllConnections(): Array<[string, string]> {
        const result: Array<[string, string]> = [];
        for (const [userId, connections] of this.connections) {
            for (const connectedId of connections.keys()) {
                result.push([userId, connectedId]);
            }
        }
        return result;
    }

    getConnections(userId: string): Set<string> {
        return new Set(this.connections.get(userId)?.keys());
    }

    private getOrCreateUserConnections(userId: string): Map<string, string> {
        if (!this.connections.has(userId)) {
            this.connections.set(userId, new Map());
        }
        return this.connections.get(userId)!;
    }

    clear(): void {
        this.connections.clear();
    }
}

export class WebRTCCommunicationStrategy implements ICommunicationStrategy {
    constructor(
        private readonly _space: ICommunicationSpace,
        private users: ReadonlyMap<string, SpaceUser>,
        private usersToNotify: ReadonlyMap<string, SpaceUser>,
        private readonly _connections: ConnectionManager = new ConnectionManager(),
    ) {}
    addUserReady(userId: string): void {}
    canSwitch(): boolean {
        return true;
    }

    public addUser(newUser: SpaceUser): Promise<void> {
        // When someone enters the space, we don't need to try establishing the connection. We must wait for the user to watch
        // the space for that.

        if (!this.usersToNotify.has(newUser.spaceUserId)) {
            return Promise.resolve();
        }

        const freshNewUser = this.getFreshUser(newUser);

        for (const existingUser of this.usersToNotify.values()) {
            if (existingUser.spaceUserId === newUser.spaceUserId) {
                continue;
            }
            const freshExistingUser = this.getFreshUser(existingUser);
            try {
                if (this.shouldEstablishConnection(freshNewUser, freshExistingUser)) {
                    this.establishConnection(freshNewUser, freshExistingUser);
                }
            } catch (error) {
                console.error(
                    "An error occurred while adding a new user to WebRTC discussion",
                    freshNewUser,
                    freshExistingUser,
                    error,
                );
                Sentry.captureException(error);
            }
        }

        return Promise.resolve();
    }

    public deleteUser(user: SpaceUser): void {
        if (!this.usersToNotify.has(user.spaceUserId)) {
            this.shutdownAllConnections(user);
        }

        for (const userToNotify of this.usersToNotify.values()) {
            if (!this.users.has(userToNotify.spaceUserId)) {
                this.shutdownConnection(user.spaceUserId, userToNotify.spaceUserId);
            }
        }

        this.cleanupUserMessages(user.spaceUserId);
    }

    private shutdownAllConnections(user: SpaceUser): void {
        const connections = this._connections.getConnections(user.spaceUserId);
        connections.forEach((connection) => {
            if (this._connections.hasConnection(connection, user.spaceUserId)) {
                this.shutdownConnection(user.spaceUserId, connection);
            }
        });
    }

    public async addUserToNotify(user: SpaceUser): Promise<void> {
        const freshUser = this.getFreshUser(user);

        for (const userInFilter of this.users.values()) {
            if (userInFilter.spaceUserId === user.spaceUserId) {
                continue;
            }
            const freshUserInFilter = this.getFreshUser(userInFilter);
            try {
                if (this.shouldEstablishConnection(freshUser, freshUserInFilter)) {
                    this.establishConnection(freshUser, freshUserInFilter);
                }
            } catch (error) {
                console.error(
                    "An error occurred while adding a user to notify in WebRTCCommunicationStrategy",
                    freshUser,
                    freshUserInFilter,
                    error,
                );
                Sentry.captureException(error);
            }
        }

        return Promise.resolve();
    }
    public deleteUserFromNotify(user: SpaceUser): void {
        for (const userInFilter of this.users.values()) {
            if (userInFilter.spaceUserId === user.spaceUserId) {
                continue;
            }
            this.shutdownConnection(user.spaceUserId, userInFilter.spaceUserId);
        }

        this.cleanupUserToNotifyMessages(user.spaceUserId);
    }

    public updateUser(user: SpaceUser): void {
        for (const peer of this.getOtherKnownUsers(user.spaceUserId)) {
            const hasExistingConnection = this.hasAnyExistingConnection(user.spaceUserId, peer.spaceUserId);
            if (hasExistingConnection && !this.canEstablishConnection(user, peer)) {
                this.shutdownConnection(user.spaceUserId, peer.spaceUserId);
                continue;
            }
            if (!hasExistingConnection && this.shouldEstablishConnection(user, peer)) {
                this.establishConnection(user, peer);
            }
        }
    }
    private shutdownConnection(user: string, otherUser: string): void {
        try {
            this.sendWebRTCDisconnect(user, otherUser);
        } catch (error) {
            console.error(
                "An error occurred while sending a disconnect in WebRTCCommunicationStrategy shutdownConnection 1",
                user,
                otherUser,
                error,
            );
            Sentry.captureException(error);
        }
        try {
            this.sendWebRTCDisconnect(otherUser, user);
        } catch (error) {
            console.error(
                "An error occurred while sending a disconnect in WebRTCCommunicationStrategy shutdownConnection 2",
                otherUser,
                user,
                error,
            );
            Sentry.captureException(error);
        }
    }

    private shouldEstablishConnection(user1: SpaceUser, user2: SpaceUser): boolean {
        const hasExisting = this.hasAnyExistingConnection(user1.spaceUserId, user2.spaceUserId);
        // Only establish if we need media connection AND don't already have one
        return !hasExisting && this.canEstablishConnection(user1, user2);
    }

    private canEstablishConnection(user1: SpaceUser, user2: SpaceUser): boolean {
        if (this._space.filterType !== FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK) {
            return true;
        }

        return (
            this.hasFeedbackStreamingRole(user1) &&
            this.hasFeedbackStreamingRole(user2) &&
            this.hasSpeaker(user1, user2)
        );
    }

    private hasFeedbackStreamingRole(user: SpaceUser): boolean {
        return user.megaphoneState || user.attendeesState;
    }

    private hasSpeaker(user1: SpaceUser, user2: SpaceUser): boolean {
        return user1.megaphoneState || user2.megaphoneState;
    }

    private establishConnection(user1: SpaceUser, user2: SpaceUser): void {
        const connectionId = uuidv4();
        this.sendWebRTCStart(user1.spaceUserId, user2.spaceUserId, true, connectionId);
        this.sendWebRTCStart(user2.spaceUserId, user1.spaceUserId, false, connectionId);
    }

    private cleanupUserMessages(userId: string): void {
        this._connections.removeUser(userId);
    }

    private cleanupUserToNotifyMessages(userId: string): void {
        this._connections.removeUserToNotify(userId);
    }

    private hasExistingConnection(userId1: string, userId2: string): boolean {
        return this._connections.hasConnection(userId1, userId2);
    }

    private hasAnyExistingConnection(userId1: string, userId2: string): boolean {
        return this.hasExistingConnection(userId1, userId2) || this.hasExistingConnection(userId2, userId1);
    }

    private getOtherKnownUsers(userId: string): SpaceUser[] {
        const knownUsers = new Map<string, SpaceUser>([...this.usersToNotify, ...this.users]);
        knownUsers.delete(userId);
        return Array.from(knownUsers.values(), (user) => this.getFreshUser(user));
    }

    private getKnownUser(userId: string): SpaceUser | undefined {
        return this.users.get(userId) ?? this._space.getUser(userId) ?? this.usersToNotify.get(userId);
    }

    private getFreshUser(user: SpaceUser): SpaceUser {
        return this.users.get(user.spaceUserId) ?? this._space.getUser(user.spaceUserId) ?? user;
    }

    private sendWebRTCStart(senderId: string, receiverId: string, isInitiator: boolean, connectionId: string): void {
        this._connections.addConnection(senderId, receiverId, connectionId);

        this._space.dispatchPrivateEvent({
            spaceName: this._space.getSpaceName(),
            receiverUserId: receiverId,
            senderUserId: senderId,
            spaceEvent: {
                event: {
                    $case: "webRtcStartMessage",
                    webRtcStartMessage: {
                        userId: senderId,
                        initiator: isInitiator,
                        connectionId: connectionId,
                    },
                },
            },
        });
    }

    private sendWebRTCDisconnect(senderId: string, receiverId: string): void {
        this._connections.removeConnection(senderId, receiverId);
        this._space.dispatchPrivateEvent({
            spaceName: this._space.getSpaceName(),
            receiverUserId: receiverId,
            senderUserId: senderId,
            spaceEvent: {
                event: {
                    $case: "webRtcDisconnectMessage",
                    webRtcDisconnectMessage: {
                        userId: senderId,
                    },
                },
            },
        });
    }

    initialize(users: ReadonlyMap<string, SpaceUser>, usersToNotify: ReadonlyMap<string, SpaceUser>): Promise<void> {
        this.users = users;
        this.usersToNotify = usersToNotify;
        users.forEach((user1) => {
            usersToNotify.forEach((user2) => {
                if (user1.spaceUserId === user2.spaceUserId) {
                    return;
                }
                const freshUser1 = this.getFreshUser(user1);
                const freshUser2 = this.getFreshUser(user2);
                try {
                    if (this.shouldEstablishConnection(freshUser1, freshUser2)) {
                        this.establishConnection(freshUser1, freshUser2);
                        return;
                    }
                } catch (error) {
                    console.error(
                        "An error occurred while initializing WebRTCCommunicationStrategy",
                        freshUser1,
                        freshUser2,
                        error,
                    );
                    Sentry.captureException(error);
                }
            });
        });
        return Promise.resolve();
    }

    public handleMeetingConnectionRestartMessage(
        meetingConnectionRestartMessage: MeetingConnectionRestartMessage,
        senderUserId: string,
    ) {
        const receiverId = meetingConnectionRestartMessage.userId;
        if (!receiverId) {
            console.warn("No receiverId found for meetingConnectionRestartMessage ", meetingConnectionRestartMessage);
            return;
        }

        // A connection is tracked in both directions with the same id, but a partial cleanup may
        // leave only one direction, so look both ways to recover the currently tracked id.
        const existingConnectionId =
            this._connections.getConnectionId(senderUserId, receiverId) ??
            this._connections.getConnectionId(receiverId, senderUserId);

        if (existingConnectionId === undefined) {
            console.warn("No existing connection found for meetingConnectionRestartMessage ", senderUserId, receiverId);
            return;
        }

        // Ignore stale restart requests that reference a connection we have already replaced.
        if (
            meetingConnectionRestartMessage.connectionId !== undefined &&
            meetingConnectionRestartMessage.connectionId !== existingConnectionId
        ) {
            return;
        }

        // The peers may no longer be allowed to talk P2P (e.g. a feedback attendee lost their
        // role): tear the connection down instead of restarting it.
        const sender = this.getKnownUser(senderUserId);
        const receiver = this.getKnownUser(receiverId);
        if (!sender || !receiver || !this.canEstablishConnection(sender, receiver)) {
            this.shutdownConnection(senderUserId, receiverId);
            return;
        }

        const connectionId = uuidv4();
        this.sendWebRTCStart(receiverId, senderUserId, true, connectionId);
        this.sendWebRTCStart(senderUserId, receiverId, false, connectionId);
    }

    cleanup(): void {
        for (const [senderId, receiverId] of this._connections.getAllConnections()) {
            this._space.dispatchPrivateEvent({
                spaceName: this._space.getSpaceName(),
                receiverUserId: receiverId,
                senderUserId: senderId,
                spaceEvent: {
                    event: {
                        $case: "webRtcDisconnectMessage",
                        webRtcDisconnectMessage: {
                            userId: senderId,
                        },
                    },
                },
            });
        }
        this._connections.clear();
    }
}
