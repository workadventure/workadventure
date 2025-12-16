import type { SpaceUser } from "@workadventure/messages";
import type { IUserRegistry } from "../Interfaces/IUserRegistry";

/**
 * Manages user registration in a communication space.
 * Maintains separate collections for active users and users to notify.
 */
export class UserRegistry implements IUserRegistry {
    private readonly users: Map<string, SpaceUser> = new Map();
    private readonly usersToNotify: Map<string, SpaceUser> = new Map();

    /**
     * Adds a user to the active users collection.
     */
    addUser(user: SpaceUser): void {
        this.users.set(user.spaceUserId, user);
    }

    /**
     * Removes a user from the active users collection.
     */
    deleteUser(spaceUserId: string): void {
        this.users.delete(spaceUserId);
    }

    /**
     * Adds a user to the users to notify collection.
     */
    addUserToNotify(user: SpaceUser): void {
        this.usersToNotify.set(user.spaceUserId, user);
    }

    /**
     * Removes a user from the users to notify collection.
     */
    deleteUserToNotify(spaceUserId: string): void {
        this.usersToNotify.delete(spaceUserId);
    }

    /**
     * Returns the active users collection (read-only).
     */
    getUsers(): ReadonlyMap<string, SpaceUser> {
        return this.users;
    }

    /**
     * Returns the users to notify collection (read-only).
     */
    getUsersToNotify(): ReadonlyMap<string, SpaceUser> {
        return this.usersToNotify;
    }

    /**
     * Returns the total count of unique users (active + to notify).
     * Users present in both collections are counted once.
     */
    getTotalCount(): number {
        const allUserIds = new Set([...this.users.keys(), ...this.usersToNotify.keys()]);
        return allUserIds.size;
    }

    /**
     * Checks if a user exists in the active users collection.
     */
    hasUser(spaceUserId: string): boolean {
        return this.users.has(spaceUserId);
    }

    /**
     * Checks if a user exists in the users to notify collection.
     */
    hasUserToNotify(spaceUserId: string): boolean {
        return this.usersToNotify.has(spaceUserId);
    }
}
