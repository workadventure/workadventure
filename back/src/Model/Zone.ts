import type { EmoteEventMessage, SetPlayerDetailsMessage, PlayerDetailsUpdatedMessage } from "@workadventure/messages";
import type { PositionInterface } from "../Model/PositionInterface";
import type { RoomSocket } from "../RoomManager";
import { User } from "./User";
import type { Movable } from "./Movable";
import { Group } from "./Group";
import type { CustomJsonReplacerInterface } from "./CustomJsonReplacerInterface";

export type EntersCallback = (thing: Movable, currentZone: Zone, fromZone: Zone | null, listener: RoomSocket) => void;
export type MovesCallback = (
    thing: Movable,
    currentZone: Zone,
    position: PositionInterface,
    listener: RoomSocket
) => void;
export type LeavesCallback = (thing: Movable, currentZone: Zone, newZone: Zone | null, listener: RoomSocket) => void;
export type EmoteCallback = (emoteEventMessage: EmoteEventMessage, currentZone: Zone, listener: RoomSocket) => void;
export type LockGroupCallback = (currentZone: Zone, groupId: number, listener: RoomSocket) => void;
export type GroupUsersUpdatedCallback = (currentZone: Zone, group: Group, listener: RoomSocket) => void;
export type PlayerDetailsUpdatedCallback = (
    currentZone: Zone,
    playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage,
    listener: RoomSocket
) => void;

export interface ZonePosition {
    readonly x: number;
    readonly y: number;
}

export class Zone implements CustomJsonReplacerInterface, ZonePosition {
    private things: Set<Movable> = new Set<Movable>();
    private listeners: Set<RoomSocket> = new Set<RoomSocket>();

    constructor(
        private onEnters: EntersCallback,
        private onMoves: MovesCallback,
        private onLeaves: LeavesCallback,
        private onEmote: EmoteCallback,
        private onLockGroup: LockGroupCallback,
        private onPlayerDetailsUpdated: PlayerDetailsUpdatedCallback,
        private onGroupUsersUpdated: GroupUsersUpdatedCallback,
        public readonly x: number,
        public readonly y: number
    ) {}

    /**
     * A user/thing leaves the zone
     */
    public leave(thing: Movable, newZone: Zone | null) {
        const result = this.things.delete(thing);
        if (!result) {
            // if the user socket end event was emitted, the connection is already closed
            if (thing instanceof User) {
                throw new Error(`Could not find user in zone ${thing.id}`);
            }
            if (thing instanceof Group) {
                throw new Error(
                    `Could not find group ${thing.getId()} in zone (${this.x},${this.y}). Position of group: (${
                        thing.getPosition().x
                    },${thing.getPosition().y})`
                );
            }
        }
        this.notifyLeft(thing, newZone);
    }

    /**
     * Notify listeners of this zone that this user/thing left
     */
    private notifyLeft(thing: Movable, newZone: Zone | null) {
        for (const listener of this.listeners) {
            this.onLeaves(thing, this, newZone, listener);
        }
    }

    public enter(thing: Movable, oldZone: Zone | null, position: PositionInterface) {
        this.things.add(thing);
        this.notifyEnter(thing, oldZone, position);
    }

    /**
     * Notify listeners of this zone that this user entered
     */
    private notifyEnter(thing: Movable, oldZone: Zone | null, position: PositionInterface) {
        for (const listener of this.listeners) {
            this.onEnters(thing, this, oldZone, listener);
        }
    }

    public move(thing: Movable, position: PositionInterface) {
        if (!this.things.has(thing)) {
            this.things.add(thing);
            this.notifyEnter(thing, null, position);
            return;
        }

        for (const listener of this.listeners) {
            //if (listener !== thing) {
            this.onMoves(thing, this, position, listener);
            //}
        }
    }

    public getThings(): Set<Movable> {
        return this.things;
    }

    public addListener(socket: RoomSocket): void {
        if (this.listeners.has(socket)) {
            console.warn(`Double subscription detected: socket already listening to zone (${this.x},${this.y})`);
        }
        this.listeners.add(socket);
        // TODO: here, we should trigger in some way the sending of current items
    }

    public removeListener(socket: RoomSocket): void {
        this.listeners.delete(socket);
    }

    public emitEmoteEvent(emoteEventMessage: EmoteEventMessage) {
        for (const listener of this.listeners) {
            this.onEmote(emoteEventMessage, this, listener);
        }
    }

    public emitLockGroupEvent(groupId: number) {
        for (const listener of this.listeners) {
            this.onLockGroup(this, groupId, listener);
        }
    }

    public emitGroupUsersUpdatedEvent(group: Group) {
        for (const listener of this.listeners) {
            this.onGroupUsersUpdated(this, group, listener);
        }
    }

    public updatePlayerDetails(user: User, playerDetails: SetPlayerDetailsMessage) {
        // Let's filter out private variables that must not be dispatched
        if (playerDetails.setVariable?.public === false) {
            // Note: technically we should check no other fields are set on this "details" object.
            // But we know we are sending variables in separated SetPlayerDetailsMessage
            return;
        }

        for (const listener of this.listeners) {
            this.onPlayerDetailsUpdated(
                this,
                {
                    userId: user.id,
                    details: playerDetails,
                },
                listener
            );
        }
    }

    public customJsonReplacer(key: unknown, value: unknown): string | undefined {
        if (key === "listeners") {
            return `${(value as Set<RoomSocket>).size} listener(s) registered`;
        }
        return undefined;
    }
}
