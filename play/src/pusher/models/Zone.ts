import * as Sentry from "@sentry/node";
import type {
    CharacterTextureMessage,
    CompanionTextureMessage,
    EmoteEventMessage,
    ErrorMessage,
    GroupUpdateMessage,
    GroupUpdateZoneMessage,
    GroupUsersUpdateMessage,
    PlayerDetailsUpdatedMessage,
    PointMessage,
    PositionMessage,
    SayMessage,
    SetPlayerDetailsMessage,
    UserJoinedMessage,
    UserJoinedZoneMessage,
    UserMovedMessage,
    UserLeftZoneMessage,
    GroupLeftZoneMessage,
} from "@workadventure/messages";
import { AvailabilityStatus } from "@workadventure/messages";
import type { Socket } from "../services/SocketManager";

export interface ZoneEventListener {
    onUserEnters(user: UserDescriptor, listener: Socket): void;
    onUserMoves(user: UserDescriptor, listener: Socket): void;
    onUserLeaves(userId: number, listener: Socket): void;
    onGroupEnters(group: GroupDescriptor, listener: Socket): void;
    onGroupMoves(group: GroupDescriptor, listener: Socket): void;
    onGroupLeaves(groupId: number, listener: Socket): void;
    onGroupUsersUpdated(group: GroupDescriptor, listener: Socket): void;
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
        private locked: boolean | undefined,
        private _userIds: number[]
    ) {}

    public static createFromGroupUpdateZoneMessage(message: GroupUpdateZoneMessage): GroupDescriptor {
        const position = message.position;
        if (position === undefined) {
            throw new Error("Missing position");
        }
        return new GroupDescriptor(message.groupId, message.groupSize, position, message.locked, message.userIds);
    }

    public update(groupDescriptor: GroupDescriptor): void {
        this.groupSize = groupDescriptor.groupSize;
        this.position = groupDescriptor.position;
        this.locked = groupDescriptor.locked;
    }

    public updateUsers(userIds: number[]): void {
        this._userIds = userIds;
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
            userIds: this._userIds,
        };
    }

    public get userIds(): number[] {
        return this._userIds;
    }
}

interface ZoneDescriptor {
    x: number;
    y: number;
}

export class Zone {
    private users: Map<number, UserDescriptor> = new Map<number, UserDescriptor>();
    private groups: Map<number, GroupDescriptor> = new Map<number, GroupDescriptor>();
    private listeners: Set<Socket> = new Set<Socket>();

    constructor(private socketListener: ZoneEventListener, public readonly x: number, public readonly y: number) {}

    // Public handler methods called by PositionDispatcher when messages are received from back

    public handleUserJoinedZone(message: UserJoinedZoneMessage): void {
        const userDescriptor = UserDescriptor.createFromUserJoinedZoneMessage(message);
        this.users.set(message.userId, userDescriptor);

        const fromZone = message.fromZone;
        this.notifyUserEnter(userDescriptor, fromZone);
    }

    public handleGroupUpdateZone(message: GroupUpdateZoneMessage): void {
        const groupDescriptor = GroupDescriptor.createFromGroupUpdateZoneMessage(message);

        // Do we have it already?
        const groupId = message.groupId;
        const oldGroupDescriptor = this.groups.get(groupId);
        if (oldGroupDescriptor !== undefined) {
            oldGroupDescriptor.update(groupDescriptor);
            this.notifyGroupMove(groupDescriptor);
        } else {
            this.groups.set(groupId, groupDescriptor);
            const fromZone = message.fromZone;
            this.notifyGroupEnter(groupDescriptor, fromZone);
        }
    }

    public handleGroupUsersUpdate(message: GroupUsersUpdateMessage): void {
        const groupId = message.groupId;
        const oldGroupDescriptor = this.groups.get(groupId);

        if (oldGroupDescriptor !== undefined) {
            oldGroupDescriptor.updateUsers(message.userIds);
            this.notifyGroupUsersUpdated(oldGroupDescriptor);
        } else {
            console.warn("Could not find group with id " + groupId + " to update users.");
        }
    }

    public handleUserLeftZone(message: UserLeftZoneMessage): void {
        this.users.delete(message.userId);
        this.notifyUserLeft(message.userId, message.toZone);
    }

    public handleGroupLeftZone(message: GroupLeftZoneMessage): void {
        const groupId = message.groupId;
        this.groups.delete(groupId);
        this.notifyGroupLeft(groupId, message.toZone);
    }

    public handleUserMoved(message: UserMovedMessage): void {
        const userId = message.userId;
        const userDescriptor = this.users.get(userId);

        if (userDescriptor === undefined) {
            console.error('Unexpected move message received for unknown user "' + userId + '"');
            Sentry.captureException(new Error('Unexpected move message received for unknown user "' + userId + '"'));
            return;
        }

        userDescriptor.update(message);
        this.notifyUserMove(userDescriptor);
    }

    public handleEmoteEvent(message: EmoteEventMessage): void {
        this.notifyEmote(message);
    }

    public handlePlayerDetailsUpdated(message: PlayerDetailsUpdatedMessage): void {
        const userId = message.userId;
        const userDescriptor = this.users.get(userId);

        if (userDescriptor === undefined) {
            console.error('Unexpected details message received for unknown user "' + userId + '"');
            Sentry.captureException(new Error('Unexpected details message received for unknown user "' + userId + '"'));
            return;
        }

        const details = message.details;
        if (details === undefined) {
            console.error('Unexpected details message without details received for user "' + userId + '"');
            Sentry.captureException(
                new Error('Unexpected details message without details received for user "' + userId + '"')
            );
            return;
        }

        userDescriptor.updateDetails(details);
        this.notifyPlayerDetailsUpdated(message);
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

    private notifyGroupUsersUpdated(groupDescriptor: GroupDescriptor): void {
        for (const listener of this.listeners) {
            this.socketListener.onGroupUsersUpdated(groupDescriptor, listener);
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
        const zoneKey = `${x},${y}`;
        return socket.getUserData().listenedZones.has(zoneKey);
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
        userData.listenedZones.add(`${this.x},${this.y}`);
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
        userData.listenedZones.delete(`${this.x},${this.y}`);
    }
}
