import type { SpaceUser } from "@workadventure/messages";

/**
 * Interface for managing user registration in a communication space.
 * Maintains separate collections for active users and users to notify.
 */
export interface IUserRegistry {
    /**
     * Adds a user to the active users collection.
     */
    addUser(user: SpaceUser): void;

    /**
     * Removes a user from the active users collection.
     */
    deleteUser(spaceUserId: string): void;

    /**
     * Adds a user to the users to notify collection.
     */
    addUserToNotify(user: SpaceUser): void;

    /**
     * Removes a user from the users to notify collection.
     */
    deleteUserToNotify(spaceUserId: string): void;

    /**
     * Returns the active users collection (read-only).
     */
    getUsers(): ReadonlyMap<string, SpaceUser>;

    /**
     * Returns the users to notify collection (read-only).
     */
    getUsersToNotify(): ReadonlyMap<string, SpaceUser>;

    /**
     * Returns the total count of unique users (active + to notify).
     */
    getTotalCount(): number;

    /**
     * Checks if a user exists in the active users collection.
     */
    hasUser(spaceUserId: string): boolean;

    /**
     * Checks if a user exists in the users to notify collection.
     */
    hasUserToNotify(spaceUserId: string): boolean;
}
