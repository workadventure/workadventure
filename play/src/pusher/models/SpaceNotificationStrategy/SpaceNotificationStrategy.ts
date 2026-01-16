import type { SpaceUser, SubMessage } from "@workadventure/messages";
import type { Socket } from "../../services/SocketManager";
import type { SpaceUserExtended, PartialSpaceUser } from "../Space";

/**
 * Context interface that provides access to space data and notification methods.
 * This is used by strategies to interact with the space without coupling to SpaceToFrontDispatcher.
 */
export interface SpaceNotificationContext {
    readonly spaceName: string;
    readonly localName: string;
    readonly users: Map<string, SpaceUserExtended>;
    readonly localWatchers: Set<string>;
    readonly localConnectedUser: Map<string, Socket>;
    readonly localConnectedUserWithSpaceUser: Map<Socket, SpaceUserExtended>;

    // Notification methods
    notifyMe(watcher: Socket, subMessage: SubMessage): void;
    notifyAll(subMessage: SubMessage): void;

    // Message creation helpers
    createAddUserMessage(user: SpaceUserExtended): SubMessage;
    createUpdateUserMessage(user: SpaceUserExtended, updateMask: string[]): SubMessage;
    createRemoveUserMessage(spaceUserId: string): SubMessage;

    // Utility
    toSpaceUser(user: SpaceUserExtended): SpaceUser;
}

/**
 * Strategy interface for handling space notifications based on filter type.
 * Each filter type can have its own implementation of how users see each other.
 *
 * Following the Open/Closed Principle:
 * - Open for extension: Add new filter types by creating new strategy implementations
 * - Closed for modification: No need to modify existing code to add new filters
 */
export interface SpaceNotificationStrategy {
    /**
     * Called when a new user is added to the space.
     * The strategy decides who should be notified about this user.
     */
    onUserAdded(context: SpaceNotificationContext, user: SpaceUserExtended): void;

    /**
     * Called when a user is updated in the space.
     * The strategy decides who should be notified and how.
     */
    onUserUpdated(
        context: SpaceNotificationContext,
        user: SpaceUserExtended,
        partialUser: PartialSpaceUser,
        updateMask: string[]
    ): void;

    /**
     * Called when a user is removed from the space.
     * The strategy decides who should be notified.
     */
    onUserRemoved(context: SpaceNotificationContext, user: SpaceUserExtended): void;

    /**
     * Filters the list of users that should be visible to a specific observer.
     * Used during initialization to send the correct user list.
     */
    filterUsersForObserver(
        context: SpaceNotificationContext,
        observer: SpaceUserExtended,
        users: SpaceUserExtended[]
    ): SpaceUserExtended[];

    /**
     * Determines if an observer should see a specific user.
     */
    shouldObserverSeeUser(observer: SpaceUserExtended, targetUser: SpaceUserExtended): boolean;
}
