import crypto from "crypto";
import { SpaceUser } from "@workadventure/messages";
import { ICommunicationStrategy } from "../Interfaces/ICommunicationStrategy";
import { WebRTCCredentialsService, webRTCCredentialsService } from "../Services/WebRTCCredentialsService";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { IWebRTCCredentials } from "../Types/CommunicationTypes";

class ConnectionManager {
    private connections: Map<string, Set<string>> = new Map();

    addConnection(user1Id: string, user2Id: string): void {
        this.getOrCreateUserConnections(user1Id).add(user2Id);
        //  this.getOrCreateUserConnections(user2Id).add(user1Id);
    }

    removeConnection(user1Id: string, user2Id: string): void {
        this.connections.get(user1Id)?.delete(user2Id);
        //this.connections.get(user2Id)?.delete(user1Id);
    }

    hasConnection(user1Id: string, user2Id: string): boolean {
        return this.connections.get(user1Id)?.has(user2Id) ?? false;
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
            for (const connectedId of connections) {
                result.push([userId, connectedId]);
            }
        }
        return result;
    }

    getConnections(userId: string): Set<string> {
        return this.connections.get(userId) ?? new Set();
    }

    private getOrCreateUserConnections(userId: string): Set<string> {
        if (!this.connections.has(userId)) {
            this.connections.set(userId, new Set());
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
        private readonly _credentialsService: WebRTCCredentialsService = webRTCCredentialsService,
        private readonly _connections: ConnectionManager = new ConnectionManager()
    ) {
        this._credentialsService = new WebRTCCredentialsService();
    }
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

        for (const existingUser of this.usersToNotify.values()) {
            if (existingUser.spaceUserId === newUser.spaceUserId) {
                continue;
            }
            if (this.shouldEstablishConnection(newUser, existingUser)) {
                this.establishConnection(newUser, existingUser);
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
        for (const userInFilter of this.users.values()) {
            if (userInFilter.spaceUserId === user.spaceUserId) {
                continue;
            }
            if (this.shouldEstablishConnection(user, userInFilter)) {
                this.establishConnection(user, userInFilter);
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
        // TODO: remove the handleUserMediaUpdate function after testing
        //this.handleUserMediaUpdate(user);
    }
    private shutdownConnection(user: string, otherUser: string): void {
        try {
            this.sendWebRTCDisconnect(user, otherUser);
        } catch (error) {
            console.error("👌👌👌👌👌👌👌 WebRTCCommunicationStrategy shutdownConnection 1", user, otherUser, error);
        }
        try {
            this.sendWebRTCDisconnect(otherUser, user);
        } catch (error) {
            console.error("👌👌👌👌👌👌👌 WebRTCCommunicationStrategy shutdownConnection 2", otherUser, user, error);
        }
    }

    private shouldEstablishConnection(user1: SpaceUser, user2: SpaceUser): boolean {
        const hasExisting = this.hasExistingConnection(user1.spaceUserId, user2.spaceUserId);
        // Only establish if we need media connection AND don't already have one
        return !hasExisting;
    }

    private establishConnection(user1: SpaceUser, user2: SpaceUser): void {
        const credentials1 = this._credentialsService.generateCredentials(
            crypto.createHash("md5").update(user1.spaceUserId).digest("hex").slice(0, 5)
        );
        const credentials2 = this._credentialsService.generateCredentials(
            crypto.createHash("md5").update(user2.spaceUserId).digest("hex").slice(0, 5)
        );
        this.sendWebRTCStart(user1.spaceUserId, user2.spaceUserId, credentials1, true);
        this.sendWebRTCStart(user2.spaceUserId, user1.spaceUserId, credentials2, false);
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

    private sendWebRTCStart(
        senderId: string,
        receiverId: string,
        credentials: IWebRTCCredentials,
        isInitiator: boolean
    ): void {
        this._connections.addConnection(senderId, receiverId);

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
                        ...credentials,
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

    initialize(users: ReadonlyMap<string, SpaceUser>, usersToNotify: ReadonlyMap<string, SpaceUser>): void {
        users.forEach((user1) => {
            usersToNotify.forEach((user2) => {
                if (user1.spaceUserId === user2.spaceUserId) {
                    return;
                }
                if (!this.hasExistingConnection(user1.spaceUserId, user2.spaceUserId)) {
                    this.establishConnection(user1, user2);
                    return;
                }
            });
        });
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
