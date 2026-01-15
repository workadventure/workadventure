import * as Sentry from "@sentry/node";
import debug from "debug";
import type { SpaceNotificationContext, SpaceNotificationStrategy } from "./SpaceNotificationStrategy";
import type { SpaceUserExtended, PartialSpaceUser } from "../Space";

/**
 * User role for LIVE_STREAMING_USERS_WITH_FEEDBACK filter.
 */
type UserRole = "speaker" | "listener" | "none";

/**
 * Notification strategy for LIVE_STREAMING_USERS_WITH_FEEDBACK filter type.
 *
 * Visibility rules:
 * - Speakers (megaphoneState=true) see everyone (speakers + listeners)
 * - Listeners (attendeesState=true, megaphoneState=false) only see speakers
 * - None (megaphoneState=false, attendeesState=false) only see speakers
 *
 * This strategy handles complex role transitions and ensures proper visibility
 * when users change their megaphoneState or attendeesState.
 */
export class LiveStreamingNotificationStrategy implements SpaceNotificationStrategy {
    private readonly log = debug("LiveStreamingNotificationStrategy");

    // ==================== Public Interface ====================

    onUserAdded(context: SpaceNotificationContext, user: SpaceUserExtended): void {
        const newUserRole = this.getUserRole(user);

        // Prepare the message for notifying other watchers about the new user
        const newUserMessage = newUserRole !== "none" ? context.createAddUserMessage(user) : undefined;

        // Single loop: iterate over all watchers to handle both directions
        context.localWatchers.forEach((watcherId) => {
            const watcher = context.localConnectedUser.get(watcherId);
            if (!watcher) {
                console.error(`Watcher ${watcherId} not found`);
                Sentry.captureException(`Watcher ${watcherId} not found`);
                return;
            }

            const observer = context.localConnectedUserWithSpaceUser.get(watcher);
            if (!observer) {
                console.error(`Observer not found for watcher ${watcherId}`);
                return;
            }

            // Case 1: This watcher IS the new user → send them all existing users they can see
            if (watcherId === user.spaceUserId) {
                if (newUserRole !== "none") {
                    this.sendExistingUsersToWatcher(context, watcher, user);
                }
                return;
            }

            // Case 2: This watcher is NOT the new user → notify them about the new user if they can see them
            const canSee = this.shouldObserverSeeUser(observer, user);
            if (newUserMessage && canSee) {
                context.notifyMe(watcher, newUserMessage);
            }
        });
    }

    onUserUpdated(
        context: SpaceNotificationContext,
        user: SpaceUserExtended,
        _partialUser: PartialSpaceUser,
        updateMask: string[]
    ): void {
        // Get previous role from the user BEFORE the update was applied
        // Note: The caller should compute previousRole before applying the update
        // For now, we'll handle this by detecting role changes based on the updateMask
        const currentRole = this.getUserRole(user);

        // Check if this update affects role (megaphoneState or attendeesState)
        const affectsRole = updateMask.includes("megaphoneState") || updateMask.includes("attendeesState");

        if (affectsRole) {
            // For role changes, we need special handling
            // Since the update is already applied, we can only do filtered updates
            // The caller should use handleRoleChange for proper role transitions
            this.notifyUpdateWithFiltering(context, user, updateMask);
        } else {
            // No role change, just filter updates normally
            this.notifyUpdateWithFiltering(context, user, updateMask);
        }
    }

    /**
     * Handle a role transition explicitly.
     * This should be called by SpaceToFrontDispatcher when it detects a role change.
     */
    handleRoleChange(
        context: SpaceNotificationContext,
        user: SpaceUserExtended,
        previousRole: UserRole,
        newRole: UserRole,
        updateMask: string[]
    ): void {
        this.log(`${context.spaceName} : user ${user.spaceUserId} role change ${previousRole} -> ${newRole}`);

        // Find the socket for the user who changed role
        let selfSocket = this.findSocketForUser(context, user.spaceUserId);

        const isWatcher = context.localWatchers.has(user.spaceUserId);
        this.log(`${context.spaceName} : user ${user.spaceUserId} selfSocket=${!!selfSocket}, isWatcher=${isWatcher}`);

        // First, handle the user who changed role (update their view of other users)
        if (selfSocket && isWatcher) {
            this.handleSelfRoleChange(context, selfSocket, user, previousRole, newRole);
        }

        // Then, notify all OTHER watchers about this user's role change
        context.localWatchers.forEach((watcherId) => {
            if (watcherId === user.spaceUserId) return;

            const watcher = context.localConnectedUser.get(watcherId);
            if (!watcher) {
                console.error(`Watcher ${watcherId} not found`);
                Sentry.captureException(`Watcher ${watcherId} not found`);
                return;
            }

            const observer = context.localConnectedUserWithSpaceUser.get(watcher);
            if (!observer) {
                console.error(`Observer not found for watcher ${watcherId}`);
                return;
            }

            const observerRole = this.getUserRole(observer);
            this.handleOtherWatcherNotification(
                context,
                watcher,
                observerRole,
                user,
                previousRole,
                newRole,
                updateMask
            );
        });
    }

    onUserRemoved(context: SpaceNotificationContext, user: SpaceUserExtended): void {
        // Send remove message to ALL watchers
        // It's safer to send to everyone and let the frontend ignore unknown users
        const subMessage = context.createRemoveUserMessage(user.spaceUserId);
        context.notifyAll(subMessage);
    }

    filterUsersForObserver(
        _context: SpaceNotificationContext,
        observer: SpaceUserExtended,
        users: SpaceUserExtended[]
    ): SpaceUserExtended[] {
        return users.filter((user) => this.shouldObserverSeeUser(observer, user));
    }

    shouldObserverSeeUser(observer: SpaceUserExtended, targetUser: SpaceUserExtended): boolean {
        const observerRole = this.getUserRole(observer);
        const targetRole = this.getUserRole(targetUser);
        return this.couldRoleSeeRole(observerRole, targetRole);
    }

    // ==================== Role Helpers ====================

    /**
     * Determines the role of a user.
     */
    getUserRole(user: SpaceUserExtended): UserRole {
        if (user.megaphoneState === true) return "speaker";
        if (user.attendeesState === true) return "listener";
        return "none";
    }

    /**
     * Determines if an observer with a given role could see a target with a given role.
     * Rules:
     * - speakers see everyone (speakers + listeners, but not "none")
     * - listeners only see speakers
     * - "none" only see speakers
     */
    private couldRoleSeeRole(observerRole: UserRole, targetRole: UserRole): boolean {
        // "none" targets are not visible to anyone
        if (targetRole === "none") {
            return false;
        }

        // Speakers see everyone (speakers + listeners)
        if (observerRole === "speaker") {
            return true;
        }

        // Listeners and "none" only see speakers
        return targetRole === "speaker";
    }

    // ==================== Private Helpers ====================

    private findSocketForUser(context: SpaceNotificationContext, spaceUserId: string) {
        for (const [socket, spaceUser] of context.localConnectedUserWithSpaceUser.entries()) {
            if (spaceUser.spaceUserId === spaceUserId) {
                return socket;
            }
        }
        return undefined;
    }

    private sendExistingUsersToWatcher(
        context: SpaceNotificationContext,
        watcher: ReturnType<typeof context.localConnectedUser.get>,
        observer: SpaceUserExtended
    ) {
        if (!watcher) return;

        for (const [spaceUserId, existingUser] of context.users.entries()) {
            if (spaceUserId === observer.spaceUserId) continue;

            if (this.shouldObserverSeeUser(observer, existingUser)) {
                context.notifyMe(watcher, context.createAddUserMessage(existingUser));
            }
        }
    }

    private notifyUpdateWithFiltering(
        context: SpaceNotificationContext,
        user: SpaceUserExtended,
        updateMask: string[]
    ) {
        const subMessage = context.createUpdateUserMessage(user, updateMask);

        context.localWatchers.forEach((watcherId) => {
            const watcher = context.localConnectedUser.get(watcherId);
            if (!watcher) {
                console.error(`Watcher ${watcherId} not found`);
                Sentry.captureException(`Watcher ${watcherId} not found`);
                return;
            }

            const observer = context.localConnectedUserWithSpaceUser.get(watcher);
            if (!observer) {
                console.error(`Observer not found for watcher ${watcherId}`);
                return;
            }

            if (!this.shouldObserverSeeUser(observer, user)) {
                return;
            }

            context.notifyMe(watcher, subMessage);
        });
    }

    private handleSelfRoleChange(
        context: SpaceNotificationContext,
        watcher: ReturnType<typeof context.localConnectedUser.get>,
        user: SpaceUserExtended,
        previousRole: UserRole,
        newRole: UserRole
    ) {
        if (!watcher) return;

        this.log(`${context.spaceName} : handleSelfRoleChange for ${user.spaceUserId}`);

        for (const [spaceUserId, existingUser] of context.users.entries()) {
            if (spaceUserId === user.spaceUserId) continue;

            const existingUserRole = this.getUserRole(existingUser);
            const wasVisible = this.couldRoleSeeRole(previousRole, existingUserRole);
            const isVisible = this.couldRoleSeeRole(newRole, existingUserRole);

            if (!wasVisible && isVisible) {
                context.notifyMe(watcher, context.createAddUserMessage(existingUser));
            } else if (wasVisible && !isVisible) {
                context.notifyMe(watcher, context.createRemoveUserMessage(existingUser.spaceUserId));
            }
        }
    }

    private handleOtherWatcherNotification(
        context: SpaceNotificationContext,
        watcher: ReturnType<typeof context.localConnectedUser.get>,
        observerRole: UserRole,
        user: SpaceUserExtended,
        previousRole: UserRole,
        newRole: UserRole,
        updateMask: string[]
    ) {
        if (!watcher) return;

        const wasVisible = this.couldRoleSeeRole(observerRole, previousRole);
        const isVisible = this.couldRoleSeeRole(observerRole, newRole);

        this.log(
            `${context.spaceName} : handleOtherWatcherNotification observer(${observerRole}) -> user ${user.spaceUserId} (${previousRole}->${newRole}): wasVisible=${wasVisible}, isVisible=${isVisible}`
        );

        if (!wasVisible && isVisible) {
            context.notifyMe(watcher, context.createAddUserMessage(user));
        } else if (wasVisible && !isVisible) {
            context.notifyMe(watcher, context.createRemoveUserMessage(user.spaceUserId));
        } else if (wasVisible && isVisible) {
            context.notifyMe(watcher, context.createUpdateUserMessage(user, updateMask));
        }
    }
}
