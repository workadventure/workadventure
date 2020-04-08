import {MessageUserPosition} from "./Websocket/MessageUserPosition";
import { World } from "./World";
export class Group {
    static readonly MAX_PER_GROUP = 4;
    
    users: MessageUserPosition[];

    constructor(users: MessageUserPosition[]) {
        this.users = users;
    }

    getUsers(): MessageUserPosition[] {
        return this.users;
    }

    isFull(): boolean {
        return this.users.length >= Group.MAX_PER_GROUP;
    }

    isPartOfGroup(user: MessageUserPosition): boolean
    {
        return this.users.indexOf(user) !== -1;
    }

    isStillIn(user: MessageUserPosition): boolean
    {
        if(!this.isPartOfGroup(user)) {
            return false;
        }
        let stillIn = true;
        for(let i = 0; i <= this.users.length; i++) {
            let userInGroup = this.users[i];
            let distance = World.computeDistance(user.position, userInGroup.position);
            if(distance > World.MIN_DISTANCE) {
                stillIn = false;
                break;
            }
        }
        return stillIn;
    }

    removeFromGroup(users: MessageUserPosition[]): void
    {
        for(let i = 0; i < users.length; i++) {
            let user = users[i];
            const index = this.users.indexOf(user, 0);
            if (index > -1) {
                this.users.splice(index, 1);
            }
        }
    }
}