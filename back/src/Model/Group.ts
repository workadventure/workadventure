import { ConnectCallback, DisconnectCallback, GameRoom } from "./GameRoom";
import { User } from "./User";
import { PositionInterface } from "_Model/PositionInterface";
import { Movable } from "_Model/Movable";
import { PositionNotifier } from "_Model/PositionNotifier";
import { MAX_PER_GROUP } from "../Enum/EnvironmentVariable";
import type { Zone } from "../Model/Zone";

export class Group implements Movable {
    private static nextId: number = 1;

    private id: number;
    private users: Set<User>;
    private x!: number;
    private y!: number;
    private wasDestroyed: boolean = false;
    private roomId: string;
    private currentZone: Zone | null = null;
    /**
     * When outOfBounds = true, a user if out of the bounds of the group BUT still considered inside it (because we are in following mode)
     */
    private outOfBounds = false;

    constructor(
        roomId: string,
        users: User[],
        private groupRadius: number,
        private connectCallback: ConnectCallback,
        private disconnectCallback: DisconnectCallback,
        private positionNotifier: PositionNotifier
    ) {
        this.roomId = roomId;
        this.users = new Set<User>();
        this.id = Group.nextId;
        Group.nextId++;

        users.forEach((user: User) => {
            this.join(user);
        });

        this.updatePosition();
    }

    getUsers(): User[] {
        return Array.from(this.users.values());
    }

    getId(): number {
        return this.id;
    }

    /**
     * Returns the barycenter of all users (i.e. the center of the group)
     */
    getPosition(): PositionInterface {
        return {
            x: this.x,
            y: this.y,
        };
    }

    /**
     * Returns the list of users of the group, ignoring any "followers".
     * Useful to compute the position of the group if a follower is "trapped" far away from the the leader.
     */
    getGroupHeads(): User[] {
        return Array.from(this.users).filter((user) => user.group?.leader === user || !user.following);
    }

    /**
     * Preview the position of the group but don't update it
     */
    previewGroupPosition(): { x: number; y: number } | undefined {
        const users = this.getGroupHeads();

        let x = 0;
        let y = 0;

        if (users.length === 0) {
            return undefined;
        }

        users.forEach((user: User) => {
            const position = user.getPosition();
            x += position.x;
            y += position.y;
        });

        x /= users.length;
        y /= users.length;

        return { x, y };
    }

    /**
     * Computes the barycenter of all users (i.e. the center of the group)
     */
    updatePosition(): void {
        const oldX = this.x;
        const oldY = this.y;

        // Let's compute the barycenter of all users.
        const newPosition = this.previewGroupPosition();

        if (!newPosition) {
            return;
        }

        const { x, y } = newPosition;

        this.x = x;
        this.y = y;

        if (this.outOfBounds) {
            return;
        }

        if (oldX === undefined) {
            this.currentZone = this.positionNotifier.enter(this);
        } else {
            this.currentZone = this.positionNotifier.updatePosition(this, { x, y }, { x: oldX, y: oldY });
        }
    }

    searchForNearbyUsers(): void {
        if (!this.currentZone) return;

        for (const user of this.positionNotifier.getAllUsersInSquareAroundZone(this.currentZone)) {
            //  Todo: Merge two groups with a leader
            if (user.group || this.isFull()) return; //we ignore users that are already in a group.
            const distance = GameRoom.computeDistanceBetweenPositions(user.getPosition(), this.getPosition());
            if (distance < this.groupRadius) {
                this.join(user);
                this.setOutOfBounds(false);
                this.updatePosition();
            }
        }
    }

    isFull(): boolean {
        return this.users.size >= MAX_PER_GROUP;
    }

    isEmpty(): boolean {
        return this.users.size <= 1;
    }

    join(user: User): void {
        // Broadcast on the right event
        this.connectCallback(user, this);
        this.users.add(user);
        user.group = this;
    }

    leave(user: User): void {
        const success = this.users.delete(user);
        if (success === false) {
            throw new Error(`Could not find user ${user.id} in the group ${this.id}`);
        }
        user.group = undefined;

        if (this.users.size !== 0) {
            this.updatePosition();
        }

        // Broadcast on the right event
        this.disconnectCallback(user, this);
    }

    /**
     * Let's kick everybody out.
     * Usually used when there is only one user left.
     */
    destroy(): void {
        if (!this.outOfBounds) {
            this.positionNotifier.leave(this);
        }

        for (const user of this.users) {
            this.leave(user);
        }
        this.wasDestroyed = true;
    }

    get getSize() {
        return this.users.size;
    }

    /**
     * A group can have at most one person leading the way in it.
     */
    get leader(): User | undefined {
        for (const user of this.users) {
            if (user.hasFollowers()) {
                return user;
            }
        }
        return undefined;
    }

    setOutOfBounds(outOfBounds: boolean): void {
        if (this.outOfBounds === true && outOfBounds === false) {
            this.positionNotifier.enter(this);
            this.outOfBounds = false;
        } else if (this.outOfBounds === false && outOfBounds === true) {
            this.positionNotifier.leave(this);
            this.outOfBounds = true;
        }
    }

    get getOutOfBounds() {
        return this.outOfBounds;
    }
}
