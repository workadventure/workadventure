import {UserInterface} from "./UserInterface";
import {PointInterface} from "_Model/Websocket/PointInterface";
import {PositionInterface} from "_Model/PositionInterface";

export type UserEntersCallback = (user: UserInterface) => void;
export type UserMovesCallback = (user: UserInterface, position: PointInterface) => void;
export type UserLeavesCallback = (user: UserInterface) => void;

export class Zone {
    private players: Set<UserInterface> = new Set<UserInterface>();
    private listeners: Set<UserInterface> = new Set<UserInterface>();

    constructor(private onUserEnters: UserEntersCallback, private onUserMoves: UserMovesCallback, private onUserLeaves: UserLeavesCallback) {
    }

    /**
     * A user leaves the zone
     */
    public leave(user: UserInterface, newZone: Zone|null) {
        this.players.delete(user);
        this.notifyUserLeft(user, newZone);
    }

    /**
     * Notify listeners of this zone that this user left
     */
    private notifyUserLeft(user: UserInterface, newZone: Zone|null) {
        for (const listener of this.listeners) {
            if (listener !== user && (newZone === null || !listener.listenedZones.has(newZone))) {
                this.onUserLeaves(user);
            }
        }
    }

    public enter(user: UserInterface, oldZone: Zone|null, position: PointInterface) {
        this.players.add(user);
        this.notifyUserEnter(user, oldZone, position);
    }

    /**
     * Notify listeners of this zone that this user entered
     */
    private notifyUserEnter(user: UserInterface, oldZone: Zone|null, position: PointInterface) {
        for (const listener of this.listeners) {
            if (listener === user) {
                continue;
            }
            if (oldZone === null || !listener.listenedZones.has(oldZone)) {
                this.onUserEnters(user);
            } else {
                this.onUserMoves(user, position);
            }
        }
    }

    public move(user: UserInterface, position: PointInterface) {
        for (const listener of this.listeners) {
            if (listener !== user) {
                this.onUserMoves(user,position);
            }
        }
    }

    public startListening(user: UserInterface): void {
        for (const player of this.players) {
            if (player !== user) {
                this.onUserEnters(user);
            }
        }

        this.listeners.add(user);
        user.listenedZones.add(this);
    }

    public stopListening(user: UserInterface): void {
        for (const player of this.players) {
            if (player !== user) {
                this.onUserLeaves(user);
            }
        }

        this.listeners.delete(user);
        user.listenedZones.delete(this);
    }
}
