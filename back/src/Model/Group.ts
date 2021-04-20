import { ConnectCallback, DisconnectCallback } from "./GameRoom";
import { User } from "./User";
import {PositionInterface} from "_Model/PositionInterface";
import {Movable} from "_Model/Movable";
import {PositionNotifier} from "_Model/PositionNotifier";
import {gaugeManager} from "../Services/GaugeManager";
import {MAX_PER_GROUP} from "../Enum/EnvironmentVariable";

export class Group implements Movable {

    private static nextId: number = 1;

    private id: number;
    private users: Set<User>;
    private x!: number;
    private y!: number;
    private hasEditedGauge: boolean = false;
    private wasDestroyed: boolean = false;
    private roomId: string;


    constructor(roomId: string, users: User[], private connectCallback: ConnectCallback, private disconnectCallback: DisconnectCallback, private positionNotifier: PositionNotifier) {
        this.roomId = roomId;
        this.users = new Set<User>();
        this.id = Group.nextId;
        Group.nextId++;
        //we only send a event for prometheus metrics if the group lives more than 5 seconds
        setTimeout(() => {
            if (!this.wasDestroyed) {
                this.hasEditedGauge = true;
                gaugeManager.incNbGroupsPerRoomGauge(roomId);
            }
        }, 5000);

        users.forEach((user: User) => {
            this.join(user);
        });

        this.updatePosition();
    }

    getUsers(): User[] {
        return Array.from(this.users.values());
    }

    getId() : number {
        return this.id;
    }

    /**
     * Returns the barycenter of all users (i.e. the center of the group)
     */
    getPosition(): PositionInterface {
        return {
            x: this.x,
            y: this.y
        };
    }

    /**
     * Computes the barycenter of all users (i.e. the center of the group)
     */
    updatePosition(): void {
        const oldX = this.x;
        const oldY = this.y;

        let x = 0;
        let y = 0;
        // Let's compute the barycenter of all users.
        this.users.forEach((user: User) => {
            const position = user.getPosition();
            x += position.x;
            y += position.y;
        });
        x /= this.users.size;
        y /= this.users.size;
        if (this.users.size === 0) {
            throw new Error("EMPTY GROUP FOUND!!!");
        }
        this.x = x;
        this.y = y;

        if (oldX === undefined) {
            this.positionNotifier.enter(this);
        } else {
            this.positionNotifier.updatePosition(this, {x, y}, {x: oldX, y: oldY});
        }
    }

    isFull(): boolean {
        return this.users.size >= MAX_PER_GROUP;
    }

    isEmpty(): boolean {
        return this.users.size <= 1;
    }

    join(user: User): void
    {
        // Broadcast on the right event
        this.connectCallback(user, this);
        this.users.add(user);
        user.group = this;
    }

    leave(user: User): void
    {
        const success = this.users.delete(user);
        if (success === false) {
            throw new Error("Could not find user "+user.id+" in the group "+this.id);
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
    destroy(): void
    {
        if (this.hasEditedGauge) gaugeManager.decNbGroupsPerRoomGauge(this.roomId);
        for (const user of this.users) {
            this.leave(user);
        }
        this.wasDestroyed = true;
    }

    get getSize(){
        return this.users.size;
    }
}
