import type { SpaceNotificationContext, SpaceNotificationStrategy } from "./SpaceNotificationStrategy";
import type { SpaceUserExtended, PartialSpaceUser } from "../Space";

/**
 * Default notification strategy that broadcasts all events to all watchers.
 * Used for FilterType.ALL_USERS and any other filter type that doesn't require special handling.
 *
 * This is the simplest strategy: everyone sees everyone.
 */
export class DefaultNotificationStrategy implements SpaceNotificationStrategy {
    onUserAdded(context: SpaceNotificationContext, user: SpaceUserExtended): void {
        const subMessage = context.createAddUserMessage(user);
        context.notifyAll(subMessage);
    }

    onUserUpdated(
        context: SpaceNotificationContext,
        user: SpaceUserExtended,
        _partialUser: PartialSpaceUser,
        updateMask: string[]
    ): void {
        const subMessage = context.createUpdateUserMessage(user, updateMask);
        context.notifyAll(subMessage);
    }

    onUserRemoved(context: SpaceNotificationContext, user: SpaceUserExtended): void {
        const subMessage = context.createRemoveUserMessage(user.spaceUserId);
        context.notifyAll(subMessage);
    }

    filterUsersForObserver(
        _context: SpaceNotificationContext,
        _observer: SpaceUserExtended,
        users: SpaceUserExtended[]
    ): SpaceUserExtended[] {
        // Default: observer sees all users
        return users;
    }

    shouldObserverSeeUser(_observer: SpaceUserExtended, _targetUser: SpaceUserExtended): boolean {
        // Default: everyone sees everyone
        return true;
    }
}
