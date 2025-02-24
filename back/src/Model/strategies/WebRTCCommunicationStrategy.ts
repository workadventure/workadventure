import { SpaceUser } from "@workadventure/messages";
import { ICommunicationStrategy } from "../interfaces/ICommunicationStrategy";
import { ICommunicationSpaceManager } from "../interfaces/ICommunicationSpaceManager";
import  {WebRTCCredentialsService , webRTCCredentialsService} from "../services/WebRTCCredentialsService";
import { IWebRTCCredentials } from "../types/CommunicationTypes";

export class WebRTCCommunicationStrategy implements ICommunicationStrategy {
    private readonly _messageTracker: Map<string, boolean> = new Map();

    constructor(private readonly _space: ICommunicationSpaceManager, private readonly _credentialsService: WebRTCCredentialsService = webRTCCredentialsService ) {
        this._credentialsService = new WebRTCCredentialsService();
    }

    public addUser(newUser: SpaceUser): void {
        const existingUsers = this._space.getAllUsers()
            .filter(user => user.id !== newUser.id);

        existingUsers.forEach(existingUser => {
            if (this.shouldEstablishConnection(newUser, existingUser)) {
                this.establishConnection(newUser, existingUser);
            }
        });
    }

    public deleteUser(user: SpaceUser): void {
        this.cleanupUserMessages(user.id);
    }

    public updateUser(user: SpaceUser): void {

            this.handleUserMediaUpdate(user);
    }
    private shutdownConnection(user: SpaceUser, otherUser: SpaceUser): void {
        this.sendWebRTCDisconnect(user.id, otherUser.id);
        this.sendWebRTCDisconnect(otherUser.id, user.id);

    }
    private shouldEstablishConnection(user1: SpaceUser, user2: SpaceUser): boolean {
        return this.hasActiveMediaState(user1) || this.hasActiveMediaState(user2);
    }

    private hasActiveMediaState(user: SpaceUser): boolean {
        return user.cameraState || user.microphoneState;
    }

    private establishConnection(user1: SpaceUser, user2: SpaceUser): void {
        const credentials1 = this._credentialsService.generateCredentials(user1.id.toString());
        const credentials2 = this._credentialsService.generateCredentials(user2.id.toString());

        this.sendWebRTCStart(user1.id, user2.id, credentials1, false);
        this.sendWebRTCStart(user2.id, user1.id, credentials2, true);
    }

    private getMessageKey(senderId: number, receiverId: number): string {
        return `${senderId}_${receiverId}`;
    }

    private cleanupUserMessages(userId: number): void {
        for (const key of this._messageTracker.keys()) {
            if (key.includes(userId.toString())) {
                this._messageTracker.delete(key);
            }
        }
    }

    private handleUserMediaUpdate(user: SpaceUser): void {
        const otherUsers = this._space.getAllUsers()
            .filter(otherUser => otherUser.id !== user.id);

        otherUsers.forEach(otherUser => {
            if (!this.hasExistingConnection(user.id, otherUser.id)) {
                this.establishConnection(user, otherUser);
                return;
            }

            if(!this.hasActiveMediaState(otherUser) && !this.hasActiveMediaState(user)){
                this.shutdownConnection(user , otherUser);
                return;
            }
        });
    }

    private hasExistingConnection(userId1: number, userId2: number): boolean {
        const key1 = this.getMessageKey(userId1, userId2);
        const key2 = this.getMessageKey(userId2, userId1);
        return this._messageTracker.has(key1) && this._messageTracker.has(key2);
    }

    private sendWebRTCStart(
        senderId: number,
        receiverId: number,
        credentials: IWebRTCCredentials,
        isInitiator: boolean
    ): void {
        const messageKey = this.getMessageKey(senderId, receiverId);
        this._messageTracker.set(messageKey, true);

        console.log("sendWebRTCStart", senderId, receiverId, credentials, isInitiator);
        this._space.dispatchPrivateEvent({
            spaceName: this._space.getSpaceName(),
            receiverUserId: receiverId,
            senderUserId: senderId,
            spaceEvent: {
                event: {
                    $case: "webRtcStartMessage",
                    webRtcStartMessage: {
                        initiator: isInitiator,
                        ...credentials
                    }
                }
            }
        });
    }


    private sendWebRTCDisconnect(senderId: number, receiverId: number): void {
        this._messageTracker.delete(this.getMessageKey(senderId, receiverId));
        this._space.dispatchPrivateEvent({
            spaceName: this._space.getSpaceName(),
            receiverUserId: receiverId,
            senderUserId: senderId,
            spaceEvent: {
                event: {
                    $case: "webRtcDisconnectMessage",
                    webRtcDisconnectMessage: {
                        userId: senderId
                    }
                }
            }
        });
    }

    initialize(): void {
        const users = this._space.getAllUsers();
        users.forEach(user1 => {
            users.forEach(user2 => {
                if (user1.id === user2.id) {
                    return;
                }
                if (!this.hasExistingConnection(user1.id, user2.id)) {
                    this.establishConnection(user1, user2);
                }
            });
        });
    }

    cleanup(): void {
        for (const [messageKey] of this._messageTracker) {
            const [senderId, receiverId] = messageKey.split('_').map(Number);
            this._space.dispatchPrivateEvent({
                spaceName: this._space.getSpaceName(),
                receiverUserId: receiverId,
                senderUserId: senderId,
                spaceEvent: {
                    event: {
                        $case: "webRtcDisconnectMessage",
                        webRtcDisconnectMessage: {
                            userId: senderId
                        }
                    }
                }
            });
        }


        this._messageTracker.clear();
    }
} 