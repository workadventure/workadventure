import { SpaceUser } from "@workadventure/messages";
import { ICommunicationStrategy } from "../Interfaces/ICommunicationStrategy";
import { WebRTCCredentialsService, webRTCCredentialsService } from "../Services/WebRTCCredentialsService";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { IWebRTCCredentials } from "../Types/CommunicationTypes";

class ConnectionManager {
    private connections: Map<string, Set<string>> = new Map();

    addConnection(user1Id: string, user2Id: string): void {
        this.getOrCreateUserConnections(user1Id).add(user2Id);
        this.getOrCreateUserConnections(user2Id).add(user1Id);
    }

    removeConnection(user1Id: string, user2Id: string): void {
        this.connections.get(user1Id)?.delete(user2Id);
        this.connections.get(user2Id)?.delete(user1Id);
    }

    hasConnection(user1Id: string, user2Id: string): boolean {
        return this.connections.get(user1Id)?.has(user2Id) ?? false;
    }

    removeUser(userId: string): void {
        const userConnections = this.connections.get(userId);
        if (userConnections) {
            for (const connectedUserId of userConnections) {
                this.connections.get(connectedUserId)?.delete(userId);
            }
        }
        this.connections.delete(userId);
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
        private readonly _credentialsService: WebRTCCredentialsService = webRTCCredentialsService,
        private readonly _connections: ConnectionManager = new ConnectionManager()
    ) {
        this._credentialsService = new WebRTCCredentialsService();
    }
    addUserReady(userId: string): void {}
    canSwitch(): boolean {
        return true;
    }

    public addUser(newUser: SpaceUser): void {
        const existingUsers = this._space.getAllUsers().filter((user) => user.spaceUserId !== newUser.spaceUserId);

        existingUsers.forEach((existingUser) => {
            if (this.shouldEstablishConnection(newUser, existingUser)) {
                this.establishConnection(newUser, existingUser);
            }
        });
    }

    public deleteUser(user: SpaceUser): void {
        this.cleanupUserMessages(user.spaceUserId);
    }

    public updateUser(user: SpaceUser): void {
        this.handleUserMediaUpdate(user);
    }
    private shutdownConnection(user: SpaceUser, otherUser: SpaceUser): void {
        this.sendWebRTCDisconnect(user.spaceUserId, otherUser.spaceUserId);
        this.sendWebRTCDisconnect(otherUser.spaceUserId, user.spaceUserId);
    }
    private shouldEstablishConnection(user1: SpaceUser, user2: SpaceUser): boolean {
        return this.hasActiveMediaState(user1) || this.hasActiveMediaState(user2);
    }

    private hasActiveMediaState(user: SpaceUser): boolean {
        return user.cameraState || user.microphoneState;
    }

    private establishConnection(user1: SpaceUser, user2: SpaceUser): void {
        const credentials1 = this._credentialsService.generateCredentials(user1.spaceUserId);
        const credentials2 = this._credentialsService.generateCredentials(user2.spaceUserId);
        //TODO : identifier si on doit vraiment envoyer les credentials à tout le monde
        this.sendWebRTCStart(user1.spaceUserId, user2.spaceUserId, credentials1, false);
        this.sendWebRTCStart(user2.spaceUserId, user1.spaceUserId, credentials2, true);
    }

    private cleanupUserMessages(userId: string): void {
        this._connections.removeUser(userId);
    }

    private handleUserMediaUpdate(user: SpaceUser): void {
        const otherUsers = this._space.getAllUsers().filter((otherUser) => otherUser.spaceUserId !== user.spaceUserId);

        otherUsers.forEach((otherUser) => {
            if (!this.hasExistingConnection(user.spaceUserId, otherUser.spaceUserId)) {
                this.establishConnection(user, otherUser);
                return;
            }

            if (!this.hasActiveMediaState(otherUser) && !this.hasActiveMediaState(user)) {
                this.shutdownConnection(user, otherUser);
                return;
            }
        });
    }

    private hasExistingConnection(userId1: string, userId2: string): boolean {
        return this._connections.hasConnection(userId1, userId2);
    }

    //TODO : envoyer les events seulement aux personnes qui ont besoin de les recevoir dans prendre en compte les streaming 

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

    initialize(): void {
        const users = this._space.getAllUsers();
        users.forEach((user1) => {
            users.forEach((user2) => {
                if (user1.spaceUserId === user2.spaceUserId) {
                    return;
                }
                if (!this.hasExistingConnection(user1.spaceUserId, user2.spaceUserId)) {
                    this.establishConnection(user1, user2);
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
