import { SpaceInterface } from "./SpaceInterface";

export class Space implements SpaceInterface {
    private name: string;
    constructor(name: string, private users: Map<number, SpaceUser> = new Map(), private metadata = "") {
        this.name = name;
    }
    addUser(user: SpaceUser): void {
        if (!this.users.has(user.id)) this.users.set(user.id, user);
    }

    getMetadata(): string {
        return this.metadata;
    }

    getName(): string {
        return this.name;
    }

    getUser(id: number): SpaceUser {
        if (this.users.has(id)) return this.users.get(id);
    }

    getUsers(): SpaceUser[] {
        return Array.from(this.users.values());
    }

    removeUser(user: SpaceUser): void {
        if (this.users.has(user.id)) this.users.delete(user.id);
    }

    setMetadata(metadata: string): void {
        this.metadata = metadata;
    }

    updateUserData(user: Required<"id">): void {
        if (!this.users.has(user.id)) return;
        let userToUpdate = this.users.get(user.id);
        userToUpdate = {
            ...userToUpdate,
            ...user,
        };
        this.users.set(user.id, userToUpdate);
    }
}
