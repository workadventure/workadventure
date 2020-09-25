import {User} from "./User";
import {PositionInterface} from "_Model/PositionInterface";
import {Movable} from "./Movable";
import {Group} from "./Group";

export type EntersCallback = (thing: Movable, listener: User) => void;
export type MovesCallback = (thing: Movable, position: PositionInterface, listener: User) => void;
export type LeavesCallback = (thing: Movable, listener: User) => void;

export class Zone {
    private things: Set<Movable> = new Set<Movable>();
    private listeners: Set<User> = new Set<User>();

    /**
     * @param x For debugging purpose only
     * @param y For debugging purpose only
     */
    constructor(private onEnters: EntersCallback, private onMoves: MovesCallback, private onLeaves: LeavesCallback, private x: number, private y: number) {
    }

    /**
     * A user/thing leaves the zone
     */
    public leave(thing: Movable, newZone: Zone|null) {
        const result = this.things.delete(thing);
        if (!result) {
            if (thing instanceof User) {
                throw new Error('Could not find user in zone '+thing.id);
            }
            if (thing instanceof Group) {
                throw new Error('Could not find group '+thing.getId()+' in zone ('+this.x+','+this.y+'). Position of group: ('+thing.getPosition().x+','+thing.getPosition().y+')');
            }

        }
        this.notifyLeft(thing, newZone);
    }

    /**
     * Notify listeners of this zone that this user/thing left
     */
    private notifyLeft(thing: Movable, newZone: Zone|null) {
        for (const listener of this.listeners) {
            if (listener !== thing && (newZone === null || !listener.listenedZones.has(newZone))) {
                this.onLeaves(thing, listener);
            }
        }
    }

    public enter(thing: Movable, oldZone: Zone|null, position: PositionInterface) {
        this.things.add(thing);
        this.notifyEnter(thing, oldZone, position);
    }

    /**
     * Notify listeners of this zone that this user entered
     */
    private notifyEnter(thing: Movable, oldZone: Zone|null, position: PositionInterface) {
        for (const listener of this.listeners) {
            if (listener === thing) {
                continue;
            }
            if (oldZone === null || !listener.listenedZones.has(oldZone)) {
                this.onEnters(thing, listener);
            } else {
                this.onMoves(thing, position, listener);
            }
        }
    }

    public move(thing: Movable, position: PositionInterface) {
        if (!this.things.has(thing)) {
            this.things.add(thing);
            this.notifyEnter(thing, null, position);
            return;
        }

        for (const listener of this.listeners) {
            if (listener !== thing) {
                this.onMoves(thing,position, listener);
            }
        }
    }

    public startListening(listener: User): void {
        for (const thing of this.things) {
            if (thing !== listener) {
                this.onEnters(thing, listener);
            }
        }

        this.listeners.add(listener);
        listener.listenedZones.add(this);
    }

    public stopListening(listener: User): void {
        for (const thing of this.things) {
            if (thing !== listener) {
                this.onLeaves(thing, listener);
            }
        }

        this.listeners.delete(listener);
        listener.listenedZones.delete(this);
    }

    public getThings(): Set<Movable> {
        return this.things;
    }
}
