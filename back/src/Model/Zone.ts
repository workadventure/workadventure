import { User } from "./User";
import { PositionInterface } from "_Model/PositionInterface";
import { Movable } from "./Movable";
import { Group } from "./Group";
import { ZoneSocket } from "../RoomManager";
import {
    EmoteEventMessage,
    SetPlayerDetailsMessage,
    PlayerDetailsUpdatedMessage,
} from "../Messages/generated/messages_pb";

export type EntersCallback = (thing: Movable, fromZone: Zone | null, listener: ZoneSocket) => void;
export type MovesCallback = (thing: Movable, position: PositionInterface, listener: ZoneSocket) => void;
export type LeavesCallback = (thing: Movable, newZone: Zone | null, listener: ZoneSocket) => void;
export type EmoteCallback = (emoteEventMessage: EmoteEventMessage, listener: ZoneSocket) => void;
export type PlayerDetailsUpdatedCallback = (
    playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage,
    listener: ZoneSocket
) => void;

export class Zone {
    private things: Set<Movable> = new Set<Movable>();
    private listeners: Set<ZoneSocket> = new Set<ZoneSocket>();

    constructor(
        private onEnters: EntersCallback,
        private onMoves: MovesCallback,
        private onLeaves: LeavesCallback,
        private onEmote: EmoteCallback,
        private onPlayerDetailsUpdated: PlayerDetailsUpdatedCallback,
        public readonly x: number,
        public readonly y: number
    ) {}

    /**
     * A user/thing leaves the zone
     */
    public leave(thing: Movable, newZone: Zone | null) {
        const result = this.things.delete(thing);
        if (!result) {
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
            this.onLeaves(thing, newZone, listener);
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
            this.onEnters(thing, oldZone, listener);
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
            this.onMoves(thing, position, listener);
            //}
        }
    }

    public getThings(): Set<Movable> {
        return this.things;
    }

    public addListener(socket: ZoneSocket): void {
        this.listeners.add(socket);
        // TODO: here, we should trigger in some way the sending of current items
    }

    public removeListener(socket: ZoneSocket): void {
        this.listeners.delete(socket);
    }

    public emitEmoteEvent(emoteEventMessage: EmoteEventMessage) {
        for (const listener of this.listeners) {
            this.onEmote(emoteEventMessage, listener);
        }
    }

    public updatePlayerDetails(user: User, playerDetails: SetPlayerDetailsMessage) {
        const playerDetailsUpdatedMessage = new PlayerDetailsUpdatedMessage();
        playerDetailsUpdatedMessage.setUserid(user.id);
        playerDetailsUpdatedMessage.setDetails(playerDetails);

        for (const listener of this.listeners) {
            this.onPlayerDetailsUpdated(playerDetailsUpdatedMessage, listener);
        }
    }
}
