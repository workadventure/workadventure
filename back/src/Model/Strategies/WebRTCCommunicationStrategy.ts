import { SpaceUser } from "@workadventure/messages";
import { ICommunicationStrategy } from "../Interfaces/ICommunicationStrategy";
import { WebRTCCredentialsService, webRTCCredentialsService } from "../Services/WebRTCCredentialsService";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { IWebRTCCredentials } from "../Types/CommunicationTypes";

class ConnectionManager {
    private connections: Map<string, Set<string>> = new Map();

    addConnection(user1Id: string, user2Id: string): void {
        console.log("1️⃣1️⃣1️⃣1️⃣ ConnectionManager addConnection", user1Id, user2Id);
        this.getOrCreateUserConnections(user1Id).add(user2Id);
        this.getOrCreateUserConnections(user2Id).add(user1Id);
    }

    removeConnection(user1Id: string, user2Id: string): void {
        this.connections.get(user1Id)?.delete(user2Id);
        // this.connections.get(user2Id)?.delete(user1Id);
    }

    hasConnection(user1Id: string, user2Id: string): boolean {
        return this.connections.get(user1Id)?.has(user2Id) ?? false;
    }

    removeUser(userId: string): void {
        // const userConnections = this.connections.get(userId);
        // if (userConnections) {
        //     for (const connectedUserId of userConnections) {
        //         this.connections.get(connectedUserId)?.delete(userId);
        //     }
        // }
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
        const existingUsers = this._space.getUsersToNotify().filter((user) => user.spaceUserId !== newUser.spaceUserId);
        console.log("👌👌👌👌👌👌👌 WebRTCCommunicationStrategy addUser", newUser, existingUsers);

        existingUsers.forEach((existingUser) => {
            if (this.shouldEstablishConnection(newUser, existingUser)) {
                //TODO : l'ordre va etre important ici on veut creer la connexion user dans le filtre ===> watcher
                //seulement dans ce sens
                console.log(
                    "✅✅✅✅✅✅ WebRTCCommunicationStrategy addUser establishConnection addUser",
                    newUser,
                    existingUser
                );
                this.establishConnection(newUser, existingUser);
            } else {
                console.log(
                    "❌❌❌❌❌❌❌ WebRTCCommunicationStrategy addUser shouldEstablishConnection",
                    existingUser,
                    newUser
                );
            }
        });
    }

    public deleteUser(user: SpaceUser): void {
        this.cleanupUserMessages(user.spaceUserId);
    }

    public addUserToNotify(user: SpaceUser): void {
        const usersInFilter = this._space.getUsersInFilter();
        console.log("👌👌👌👌👌👌👌 WebRTCCommunicationStrategy addUserToNotify", user, usersInFilter);
        usersInFilter.forEach((existingUser) => {
            if (this.shouldEstablishConnection(existingUser, user)) {
                console.log(
                    "✅✅✅✅✅✅ WebRTCCommunicationStrategy addUserToNotify establishConnection addUserToNotify",
                    existingUser,
                    user
                );
                this.establishConnection(existingUser, user);
            } else {
                console.log(
                    "❌❌❌❌❌❌❌ WebRTCCommunicationStrategy addUserToNotify shouldEstablishConnection",
                    existingUser,
                    user
                );
            }
        });
    }
    public deleteUserFromNotify(user: SpaceUser): void {
        this.cleanupUserToNotifyMessages(user.spaceUserId);
    }

    public updateUser(user: SpaceUser): void {
        this.handleUserMediaUpdate(user);
    }
    private shutdownConnection(user: SpaceUser, otherUser: SpaceUser): void {
        this.sendWebRTCDisconnect(user.spaceUserId, otherUser.spaceUserId);
        this.sendWebRTCDisconnect(otherUser.spaceUserId, user.spaceUserId);
    }

    //TODO : prendre en compte seulement les users dans le filtre / 1 personne en parametre plutot que les 2
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
        this.sendWebRTCStart(user1.spaceUserId, user2.spaceUserId, credentials1, true);
        this.sendWebRTCStart(user2.spaceUserId, user1.spaceUserId, credentials2, false);
    }

    private cleanupUserMessages(userId: string): void {
        this._connections.removeUser(userId);
    }

    private cleanupUserToNotifyMessages(userId: string): void {
        this._connections.removeUserToNotify(userId);
    }

    private handleUserMediaUpdate(user: SpaceUser): void {
        const otherUsers = this._space.getAllUsers().filter((otherUser) => otherUser.spaceUserId !== user.spaceUserId);

        otherUsers.forEach((otherUser) => {
            if (!this.hasExistingConnection(user.spaceUserId, otherUser.spaceUserId)) {
                console.log(
                    "✅✅✅✅✅✅✅ ConnectionManager hasExistingConnection handleUserMediaUpdate",
                    user.spaceUserId,
                    otherUser.spaceUserId
                );
                this.establishConnection(user, otherUser);
            } else {
                console.log(
                    "❌❌❌❌❌❌❌ WebRTCCommunicationStrategy handleUserMediaUpdate hasExistingConnection",
                    user,
                    otherUser
                );
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
        //TODO : voir si on envoi le message tout le temps ou juste si il n'y a plus de connexion dans les 2 sens
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
        const users = this._space.getUsersInFilter();
        const watchers = this._space.getUsersToNotify();
        users.forEach((user1) => {
            watchers.forEach((user2) => {
                if (user1.spaceUserId === user2.spaceUserId) {
                    return;
                }
                if (!this.hasExistingConnection(user1.spaceUserId, user2.spaceUserId)) {
                    console.log(
                        "✅✅✅✅✅✅✅ ConnectionManager hasExistingConnection initialize",
                        user1.spaceUserId,
                        user2.spaceUserId
                    );
                    this.establishConnection(user1, user2);
                } else {
                    console.log(
                        "❌❌❌❌❌❌❌ WebRTCCommunicationStrategy initialize hasExistingConnection",
                        user1,
                        user2
                    );
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
