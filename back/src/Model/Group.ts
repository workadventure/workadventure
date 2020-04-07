import {MessageUserPosition} from "./Websocket/MessageUserPosition";
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
}