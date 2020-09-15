import {UserInterface} from "./UserInterface";
import {PointInterface} from "_Model/Websocket/PointInterface";
import {PositionInterface} from "_Model/PositionInterface";

export type UserEntersCallback = (user: UserInterface, listener: UserInterface) => void;
export type UserMovesCallback = (user: UserInterface, position: PointInterface, listener: UserInterface) => void;
export type UserLeavesCallback = (user: UserInterface, listener: UserInterface) => void;

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
                this.onUserLeaves(user, listener);
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
                this.onUserEnters(user, listener);
            } else {
                this.onUserMoves(user, position, listener);
            }
        }
    }

    public move(user: UserInterface, position: PointInterface) {
        if (!this.players.has(user)) {
            this.players.add(user);
            const foo = this.players;
            this.notifyUserEnter(user, null, position);
            return;
        }

        for (const listener of this.listeners) {
            if (listener !== user) {
                this.onUserMoves(user,position, listener);
            }
        }
    }

    public startListening(listener: UserInterface): void {
        for (const player of this.players) {
            if (player !== listener) {
                this.onUserEnters(player, listener);
            }
        }

        this.listeners.add(listener);
        listener.listenedZones.add(this);
    }

    public stopListening(listener: UserInterface): void {
        for (const player of this.players) {
            if (player !== listener) {
                this.onUserLeaves(player, listener);
            }
        }

        this.listeners.delete(listener);
        listener.listenedZones.delete(this);
    }

    public getPlayers(): Set<UserInterface> {
        return this.players;
    }
}
