import { World, ConnectCallback, DisconnectCallback } from "./World";
import { UserInterface } from "./UserInterface";
import {PositionInterface} from "_Model/PositionInterface";
import {uuid} from "uuidv4";

export class Group {
    static readonly MAX_PER_GROUP = 4;

    private id: string;
    private users: Set<UserInterface>;
    private connectCallback: ConnectCallback;
    private disconnectCallback: DisconnectCallback;


    constructor(users: UserInterface[], connectCallback: ConnectCallback, disconnectCallback: DisconnectCallback) {
        this.users = new Set<UserInterface>();
        this.connectCallback = connectCallback;
        this.disconnectCallback = disconnectCallback;
        this.id = uuid();

        users.forEach((user: UserInterface) => {
            this.join(user);
        });
    }

    getUsers(): UserInterface[] {
        return Array.from(this.users.values());
    }

    getId() : string{
        return this.id;
    }

    /**
     * Returns the barycenter of all users (i.e. the center of the group)
     */
    getPosition(): PositionInterface {
        let x = 0;
        let y = 0;
        // Let's compute the barycenter of all users.
        this.users.forEach((user: UserInterface) => {
            x += user.position.x;
            y += user.position.y;
        });
        x /= this.users.size;
        y /= this.users.size;
        return {
            x,
            y
        };
    }

    isFull(): boolean {
        return this.users.size >= Group.MAX_PER_GROUP;
    }

    isEmpty(): boolean {
        return this.users.size <= 1;
    }

    join(user: UserInterface): void
    {
        // Broadcast on the right event
        this.connectCallback(user.id, this);
        this.users.add(user);
        user.group = this;
    }

    leave(user: UserInterface): void
    {
        const success = this.users.delete(user);
        if (success === false) {
            throw new Error("Could not find user "+user.id+" in the group "+this.id);
        }
        user.group = undefined;

        // Broadcast on the right event
        this.disconnectCallback(user.id, this);
    }

    /**
     * Let's kick everybody out.
     * Usually used when there is only one user left.
     */
    destroy(): void
    {
        for (const user of this.users) {
            this.leave(user);
        }
    }
}
