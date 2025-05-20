import type { ClientReadableStream } from "@grpc/grpc-js";
import Debug from "debug";
import {
    AvailabilityStatus,
    BatchToPusherMessage,
    CharacterTextureMessage,
    CompanionTextureMessage,
    EmoteEventMessage,
    ErrorMessage,
    GroupUpdateMessage,
    GroupUpdateZoneMessage,
    PlayerDetailsUpdatedMessage,
    PointMessage,
    PositionMessage,
    SayMessage,
    SetPlayerDetailsMessage,
    UserJoinedMessage,
    UserJoinedZoneMessage,
    UserMovedMessage,
    ZoneMessage,
} from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import { apiClientRepository } from "../services/ApiClientRepository";
import type { PositionDispatcher } from "../models/PositionDispatcher";
import { Socket } from "../services/SocketManager";

const debug = Debug("zone");

export interface ZoneEventListener {
    onUserEnters(user: UserDescriptor, listener: Socket): void;
    onUserMoves(user: UserDescriptor, listener: Socket): void;
    onUserLeaves(userId: number, listener: Socket): void;
    onGroupEnters(group: GroupDescriptor, listener: Socket): void;
    onGroupMoves(group: GroupDescriptor, listener: Socket): void;
    onGroupLeaves(groupId: number, listener: Socket): void;
    onEmote(emoteMessage: EmoteEventMessage, listener: Socket): void;
    onError(errorMessage: ErrorMessage, listener: Socket): void;
    onPlayerDetailsUpdated(playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage, listener: Socket): void;
}

export class UserDescriptor {
    private constructor(
        public readonly userId: number,
        private userUuid: string,
        private name: string,
        private characterTextures: CharacterTextureMessage[],
        private position: PositionMessage,
        private availabilityStatus: AvailabilityStatus,
        private visitCardUrl: string | null,
        private variables: { [key: string]: string },
        private companionTexture?: CompanionTextureMessage,
        private outlineColor?: number,
        private chatID?: string,
        private sayMessage?: SayMessage
    ) {
        if (!Number.isInteger(this.userId)) {
            throw new Error("UserDescriptor.userId is not an integer: " + this.userId);
        }
    }

    public static createFromUserJoinedZoneMessage(message: UserJoinedZoneMessage): UserDescriptor {
        const position = message.position;
        if (position === undefined) {
            throw new Error("Missing position");
        }
        return new UserDescriptor(
            message.userId,
            message.userUuid,
            message.name,
            message.characterTextures,
            position,
            message.availabilityStatus,
            message.visitCardUrl,
            message.variables,
            message.companionTexture,
            message.hasOutline ? message.outlineColor : undefined,
            message.chatID,
            message.sayMessage
        );
    }

    public update(userMovedMessage: UserMovedMessage): void {
        const position = userMovedMessage.position;
        if (position === undefined) {
            throw new Error("Missing position");
        }
        this.position = position;
    }

    public updateDetails(playerDetails: SetPlayerDetailsMessage): void {
        if (playerDetails.removeOutlineColor) {
            this.outlineColor = undefined;
        } else {
            const outlineColor = playerDetails.outlineColor;
            if (outlineColor !== undefined) {
                this.outlineColor = outlineColor;
            }
        }
        const availabilityStatus = playerDetails.availabilityStatus;
        if (availabilityStatus !== AvailabilityStatus.UNCHANGED) {
            this.availabilityStatus = availabilityStatus;
        }
        const setVariable = playerDetails.setVariable;
        if (setVariable) {
            this.variables[setVariable.name] = setVariable.value;
        }
        const sayMessage = playerDetails.sayMessage;
        if (sayMessage) {
            if (!sayMessage.message) {
                this.sayMessage = undefined;
            } else {
                this.sayMessage = sayMessage;
            }
        }
    }

    public toUserJoinedMessage(): UserJoinedMessage {
        const userJoinedMessage: UserJoinedMessage = {
            userId: this.userId,
            name: this.name,
            characterTextures: this.characterTextures,
            position: this.position,
            availabilityStatus: this.availabilityStatus,
            visitCardUrl: this.visitCardUrl ?? "", // FIXME: improve the typing
            companionTexture: this.companionTexture,
            userUuid: this.userUuid,
            outlineColor: this.outlineColor ?? 0, // FIXME: improve the typing
            hasOutline: this.outlineColor !== undefined,
            variables: this.variables,
            chatID: this.chatID,
            sayMessage: this.sayMessage,
        };
        return userJoinedMessage;
    }

    public toUserMovedMessage(): UserMovedMessage {
        return {
            userId: this.userId,
            position: this.position,
        };
    }
}

export class GroupDescriptor {
    private constructor(
        public readonly groupId: number,
        private groupSize: number | undefined,
        private position: PointMessage,
        private locked: boolean | undefined
    ) {}

    public static createFromGroupUpdateZoneMessage(message: GroupUpdateZoneMessage): GroupDescriptor {
        const position = message.position;
        if (position === undefined) {
            throw new Error("Missing position");
        }
        return new GroupDescriptor(message.groupId, message.groupSize, position, message.locked);
    }

    public update(groupDescriptor: GroupDescriptor): void {
        this.groupSize = groupDescriptor.groupSize;
        this.position = groupDescriptor.position;
        this.locked = groupDescriptor.locked;
    }

    public toGroupUpdateMessage(): GroupUpdateMessage {
        if (!Number.isInteger(this.groupId)) {
            throw new Error("GroupDescriptor.groupId is not an integer: " + this.groupId);
        }
        return {
            groupId: this.groupId,
            groupSize: this.groupSize,
            position: this.position,
            locked: this.locked,
        };
    }
}

interface ZoneDescriptor {
    x: number;
    y: number;
}

export class Zone {
    //private things: Set<Movable> = new Set<Movable>();
    private users: Map<number, UserDescriptor> = new Map<number, UserDescriptor>();
    private groups: Map<number, GroupDescriptor> = new Map<number, GroupDescriptor>();
    private listeners: Set<Socket> = new Set<Socket>();
    private backConnection!: ClientReadableStream<BatchToPusherMessage>;
    private isClosing = false;

    constructor(
        private positionDispatcher: PositionDispatcher,
        private socketListener: ZoneEventListener,
        public readonly x: number,
        public readonly y: number,
        private onBackFailure: (e: Error | null, zone: Zone) => void
    ) {}

    /**
     * Creates a connection to the back server to track the users.
     */
    public init(): void {
        (async () => {
            debug("Opening connection to zone %d, %d on back server", this.x, this.y);
            try {
                const apiClient = await apiClientRepository.getClient(this.positionDispatcher.roomId);
                const zoneMessage: ZoneMessage = {
                    roomId: this.positionDispatcher.roomId,
                    x: this.x,
                    y: this.y,
                };
                this.backConnection = apiClient.listenZone(zoneMessage);
                this.backConnection.on("data", (batch: BatchToPusherMessage) => {
                    for (const message of batch.payload) {
                        if (!message.message) {
                            console.warn("Received empty message on backConnection.");
                            continue;
                        }
                        switch (message.message.$case) {
                            case "userJoinedZoneMessage": {
                                const userJoinedZoneMessage = message.message.userJoinedZoneMessage;
                                const userDescriptor =
                                    UserDescriptor.createFromUserJoinedZoneMessage(userJoinedZoneMessage);
                                this.users.set(userJoinedZoneMessage.userId, userDescriptor);

                                const fromZone = userJoinedZoneMessage.fromZone;
                                this.notifyUserEnter(userDescriptor, fromZone);
                                break;
                            }
                            case "groupUpdateZoneMessage": {
                                const groupUpdateZoneMessage = message.message.groupUpdateZoneMessage;
                                const groupDescriptor =
                                    GroupDescriptor.createFromGroupUpdateZoneMessage(groupUpdateZoneMessage);

                                // Do we have it already?
                                const groupId = groupUpdateZoneMessage.groupId;
                                const oldGroupDescriptor = this.groups.get(groupId);
                                if (oldGroupDescriptor !== undefined) {
                                    oldGroupDescriptor.update(groupDescriptor);

                                    this.notifyGroupMove(groupDescriptor);
                                } else {
                                    this.groups.set(groupId, groupDescriptor);
                                    const fromZone = groupUpdateZoneMessage.fromZone;
                                    this.notifyGroupEnter(groupDescriptor, fromZone);
                                }
                                break;
                            }
                            case "userLeftZoneMessage": {
                                const userLeftMessage = message.message.userLeftZoneMessage;
                                this.users.delete(userLeftMessage.userId);

                                this.notifyUserLeft(userLeftMessage.userId, userLeftMessage.toZone);
                                break;
                            }
                            case "groupLeftZoneMessage": {
                                const groupLeftZoneMessage = message.message.groupLeftZoneMessage;
                                const groupId = groupLeftZoneMessage.groupId;
                                this.groups.delete(groupId);

                                this.notifyGroupLeft(groupId, groupLeftZoneMessage.toZone);
                                break;
                            }
                            case "userMovedMessage": {
                                const userMovedMessage = message.message.userMovedMessage;

                                const userId = userMovedMessage.userId;
                                const userDescriptor = this.users.get(userId);

                                if (userDescriptor === undefined) {
                                    Sentry.captureException(
                                        'Unexpected move message received for unknown user "' + userId + '"'
                                    );
                                    console.error('Unexpected move message received for unknown user "' + userId + '"');
                                    return;
                                }

                                userDescriptor.update(userMovedMessage);

                                this.notifyUserMove(userDescriptor);
                                break;
                            }
                            case "emoteEventMessage": {
                                const emoteEventMessage = message.message.emoteEventMessage;
                                this.notifyEmote(emoteEventMessage);
                                break;
                            }
                            case "playerDetailsUpdatedMessage": {
                                const playerDetailsUpdatedMessage = message.message.playerDetailsUpdatedMessage;

                                const userId = playerDetailsUpdatedMessage.userId;
                                const userDescriptor = this.users.get(userId);

                                if (userDescriptor === undefined) {
                                    console.error(
                                        'Unexpected details message received for unknown user "' + userId + '"'
                                    );
                                    return;
                                }

                                const details = playerDetailsUpdatedMessage.details;
                                if (details === undefined) {
                                    console.error(
                                        'Unexpected details message without details received for user "' + userId + '"'
                                    );
                                    return;
                                }

                                userDescriptor.updateDetails(details);

                                this.notifyPlayerDetailsUpdated(playerDetailsUpdatedMessage);
                                break;
                            }
                            case "errorMessage": {
                                const errorMessage = message.message.errorMessage;
                                this.notifyError(errorMessage);
                                break;
                            }
                            default: {
                                throw new Error("Unexpected message " + message.message.$case);
                                //const _exhaustiveCheck: never = message.message;
                            }
                        }
                    }
                });

                this.backConnection.on("error", (e) => {
                    if (!this.isClosing) {
                        const date = new Date();
                        for (const listener of this.listeners) {
                            const socketData = listener.getUserData();
                            debug(
                                "Error on back connection" +
                                    socketData.userUuid +
                                    "at : " +
                                    date.toLocaleString("en-GB")
                            );
                            Sentry.captureMessage("Error on back connection" + socketData.userUuid, "debug");
                        }

                        this.close();
                        this.onBackFailure(e, this);
                    }
                });
                this.backConnection.on("close", () => {
                    if (!this.isClosing) {
                        debug("Close on back connection");
                        this.close();
                        this.onBackFailure(null, this);
                    }
                });
            } catch (e) {
                if (e instanceof Error) {
                    this.onBackFailure(e, this);
                } else {
                    throw e;
                }
            }
        })().catch((e) => {
            Sentry.captureException(e);
            console.error(e);
        });
    }

    public close(): void {
        debug("Closing connection to zone %d, %d on back server", this.x, this.y);
        this.isClosing = true;
        this.backConnection.cancel();
    }

    public hasListeners(): boolean {
        return this.listeners.size !== 0;
    }

    /**
     * Notify listeners of this zone that this user entered
     */
    private notifyUserEnter(user: UserDescriptor, oldZone: ZoneDescriptor | undefined): void {
        for (const listener of this.listeners) {
            if (listener.getUserData().userId === user.userId) {
                continue;
            }
            if (oldZone === undefined || !this.isListeningZone(listener, oldZone.x, oldZone.y)) {
                this.socketListener.onUserEnters(user, listener);
            } else {
                this.socketListener.onUserMoves(user, listener);
            }
        }
    }

    /**
     * Notify listeners of this zone that this group entered
     */
    private notifyGroupEnter(group: GroupDescriptor, oldZone: ZoneDescriptor | undefined): void {
        for (const listener of this.listeners) {
            if (oldZone === undefined || !this.isListeningZone(listener, oldZone.x, oldZone.y)) {
                this.socketListener.onGroupEnters(group, listener);
            } else {
                this.socketListener.onGroupMoves(group, listener);
            }
        }
    }

    /**
     * Notify listeners of this zone that this user left
     */
    private notifyUserLeft(userId: number, newZone: ZoneDescriptor | undefined): void {
        for (const listener of this.listeners) {
            if (listener.getUserData().userId === userId) {
                continue;
            }
            if (newZone === undefined || !this.isListeningZone(listener, newZone.x, newZone.y)) {
                this.socketListener.onUserLeaves(userId, listener);
            } else {
                // Do not send a signal. The move event will be triggered when joining the new room.
            }
        }
    }

    private notifyEmote(emoteMessage: EmoteEventMessage): void {
        for (const listener of this.listeners) {
            if (listener.getUserData().userId === emoteMessage.actorUserId) {
                continue;
            }
            this.socketListener.onEmote(emoteMessage, listener);
        }
    }

    private notifyPlayerDetailsUpdated(playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage): void {
        for (const listener of this.listeners) {
            if (listener.getUserData().userId === playerDetailsUpdatedMessage.userId) {
                continue;
            }
            this.socketListener.onPlayerDetailsUpdated(playerDetailsUpdatedMessage, listener);
        }
    }

    private notifyError(errorMessage: ErrorMessage): void {
        for (const listener of this.listeners) {
            this.socketListener.onError(errorMessage, listener);
        }
    }

    /**
     * Notify listeners of this zone that this group left
     */
    private notifyGroupLeft(groupId: number, newZone: ZoneDescriptor | undefined): void {
        for (const listener of this.listeners) {
            if (newZone === undefined || !this.isListeningZone(listener, newZone.x, newZone.y)) {
                this.socketListener.onGroupLeaves(groupId, listener);
            } else {
                // Do not send a signal. The move event will be triggered when joining the new room.
            }
        }
    }

    private isListeningZone(socket: Socket, x: number, y: number): boolean {
        // TODO: improve efficiency by not doing a full scan of listened zones.
        for (const zone of socket.getUserData().listenedZones) {
            if (zone.x === x && zone.y === y) {
                return true;
            }
        }
        return false;
    }

    private notifyGroupMove(groupDescriptor: GroupDescriptor): void {
        for (const listener of this.listeners) {
            this.socketListener.onGroupMoves(groupDescriptor, listener);
        }
    }

    private notifyUserMove(userDescriptor: UserDescriptor): void {
        for (const listener of this.listeners) {
            if (listener.getUserData().userId === userDescriptor.userId) {
                continue;
            }
            this.socketListener.onUserMoves(userDescriptor, listener);
        }
    }

    public startListening(listener: Socket): void {
        const userData = listener.getUserData();
        for (const [userId, user] of this.users.entries()) {
            if (userId !== userData.userId) {
                this.socketListener.onUserEnters(user, listener);
            }
        }

        for (const group of this.groups.values()) {
            this.socketListener.onGroupEnters(group, listener);
        }

        this.listeners.add(listener);
        userData.listenedZones.add(this);
    }

    public stopListening(listener: Socket): void {
        const userData = listener.getUserData();
        for (const userId of this.users.keys()) {
            if (userId !== userData.userId) {
                this.socketListener.onUserLeaves(userId, listener);
            }
        }

        for (const groupId of this.groups.keys()) {
            this.socketListener.onGroupLeaves(groupId, listener);
        }

        this.listeners.delete(listener);
        userData.listenedZones.delete(this);
    }
}
