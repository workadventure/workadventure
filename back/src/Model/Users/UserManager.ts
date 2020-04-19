import {uuid} from "uuidv4";
import {BehaviorSubject} from "rxjs";

export interface UserPosition {
    x: number;
    y: number;
}

export class User {
    name: string;
    email: string;
    position: UserPosition;
    id: string;
    
    constructor(id: string, name: string, email: string, position: UserPosition) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.position = position
    }
}

export interface UserPositionChangeEvent {
    user: User;
    deleted: boolean
    added: boolean
}

class UserManager {
    
    private usersList: Map<string, User> = new Map();

    private eventsList: UserPositionChangeEvent[] = [];

    //todo add more parameters
    createUser(email: string): User {
        let userId = uuid();
        let user = new User(userId, "toto", email, {x: 0, y: 0});

        this.usersList.set(userId, user);
        this.eventsList.push({added: true, deleted: false, user})
        return user;
    }

    deleteUser(id: string): User {
        let user = this.usersList.get(id);
        if (!user) {
            throw "Could not delete user with id "+id;
        }
        this.usersList.delete(id);
        
        this.eventsList.push({added: false, deleted: true, user});
        return user;
    }

    updateUserPosition(id: string, userPosition: UserPosition): User {
        let user = this.usersList.get(id);
        if (!user) {
            throw "Could not find user with id "+id;
        }
        user.position = userPosition;
        this.usersList.set(id, user);

        this.eventsList.push({added: false, deleted: false, user});
        return user;
    }
    
    getAllUsers(): User[] {
        let array = [];
        for (const value of this.usersList.values()) {
            array.push(value);
        }
        return array;
    }
    
    //flush the list of events
    getEventList(): UserPositionChangeEvent[] {
        let events = this.eventsList;
        this.eventsList = [];
        return events;
    }
}

export const userManager = new UserManager();


