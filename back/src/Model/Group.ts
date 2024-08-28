import { PositionInterface } from "../Model/PositionInterface";
import { Movable } from "../Model/Movable";
import { PositionNotifier } from "../Model/PositionNotifier";
import { MAX_PER_GROUP } from "../Enum/EnvironmentVariable";
import type { Zone } from "../Model/Zone";
import { User } from "./User";
import { ConnectCallback, DisconnectCallback, GameRoom } from "./GameRoom";
import { CustomJsonReplacerInterface } from "./CustomJsonReplacerInterface";

export class Group implements Movable, CustomJsonReplacerInterface {
    private static nextId = 1;

    private id: number;
    private users: Set<User>;
    private x: number;
    private y: number;
    private wasDestroyed = false;
    private locked = false;
    private roomId: string;
    private currentZone: Zone | null = null;
    /**
     * When outOfBounds = true, a user if out of the bounds of the group BUT still considered inside it (because we are in following mode)
     */
    private outOfBounds = false;
    /**
     * The space associated to this group.
     */
    private readonly _spaceName: string;

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

        // TODO: SECURE SPACES WITH JWT tokens.
        this._spaceName = `${this.roomId}#${this.id}#${new Date().getTime()}`;

        users.forEach((user: User) => {
            this.join(user);
        });

        const { x, y } = this.previewGroupPosition();
        this.x = x;
        this.y = y;

        this.currentZone = this.positionNotifier.enter(this);
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
        if (this.users.size === 0) {
            throw new Error("The user list in a group cannot be empty");
        }
        let users = Array.from(this.users).filter((user) => user.group?.leader === user || !user.following);
        if (users.length === 0) {
            // If the array is empty, we are in a weird scenario where a Group is containing ONLY followers.
            // The only case where this could happen is if a leader is entering a silent zone.
            users = Array.from(this.users);
        }
        return users;
    }

    /**
     * Preview the position of the group but don't update it
     */
    previewGroupPosition(): { x: number; y: number } {
        const users = this.getGroupHeads();

        let x = 0;
        let y = 0;

        if (users.length === 0) {
            throw new Error('The group cannot have no "group heads".');
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
        const { x, y } = this.previewGroupPosition();

        this.x = x;
        this.y = y;

        if (this.outOfBounds) {
            return;
        }

        this.currentZone = this.positionNotifier.updatePosition(this, { x, y }, { x: oldX, y: oldY });
    }

    searchForNearbyUsers(): void {
        if (!this.currentZone) return;

        for (const user of this.positionNotifier.getAllUsersInSquareAroundZone(this.currentZone)) {
            //  Todo: Merge two groups with a leader
            if (user.silent || user.group || this.isFull()) return; //we ignore users that are already in a group.
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

    isLocked(): boolean {
        return this.locked;
    }

    isEmpty(): boolean {
        return this.users.size <= 1;
    }

    join(user: User): void {
        // Broadcast on the right event
        this.users.add(user);
        user.group = this;
        this.connectCallback(user, this);
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

    lock(lock = true): void {
        this.locked = lock;
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

    public customJsonReplacer(key: unknown, value: unknown): string | undefined {
        if (key === "positionNotifier") {
            return "positionNotifier";
        }
        if (key === "currentZone") {
            const zone = value as Zone | null;
            return zone ? `zone ${zone.x},${zone.y}` : "null";
        }
        return undefined;
    }

    public getRoomId(): string {
        return this.roomId;
    }

    public get spaceName(): string {
        return this._spaceName;
    }
}
