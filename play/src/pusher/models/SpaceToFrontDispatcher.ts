import type {
    BackToPusherSpaceMessage,
    NonUndefinedFields,
    PrivateEventBackToPusher,
    PublicEvent,
    SubMessage,
} from "@workadventure/messages";
import { noUndefined, SpaceUser, FilterType } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
//import { asError } from "catch-unknown";
import debug from "debug";
import { merge } from "lodash";
import { applyFieldMask } from "protobuf-fieldmask";
import { z } from "zod";
import { Deferred } from "ts-deferred";
import type { Socket } from "../services/SocketManager";
import type { EventProcessor } from "./EventProcessor";
import type { SpaceUserExtended, Space, PartialSpaceUser } from "./Space";

export interface SpaceToFrontDispatcherInterface {
    handleMessage(message: BackToPusherSpaceMessage): void;
    notifyMe(watcher: Socket, subMessage: SubMessage): void;
    notifyMeAddUser(watcher: Socket, user: SpaceUserExtended): void;
    notifyMeInit(watcher: Socket): Promise<void>;
    /**
     * Notify all watchers in this space. Notification is done only to watchers.
     */
    notifyAll(subMessage: SubMessage): void;
    /**
     * Notify everybody in this space, including non-watchers. Used to propagate the "disconnect" message.
     */
    notifyAllIncludingNonWatchers(subMessage: SubMessage): void;
}

type UserRole = "speaker" | "listener" | "none";

export class SpaceToFrontDispatcher implements SpaceToFrontDispatcherInterface {
    private initDeferred = new Deferred<void>();

    constructor(private readonly _space: Space, private readonly eventProcessor: EventProcessor) {}
    handleMessage(message: BackToPusherSpaceMessage): void {
        if (!message.message) {
            console.warn("spaceStreamToBack => Empty message received.", message);
            return;
        }

        try {
            switch (message.message.$case) {
                case "initSpaceUsersMessage": {
                    const initSpaceUsersMessage = noUndefined(message.message.initSpaceUsersMessage);
                    this.initSpaceUsersMessage(initSpaceUsersMessage.users);
                    break;
                }
                case "addSpaceUserMessage": {
                    const addSpaceUserMessage = noUndefined(message.message.addSpaceUserMessage);
                    this.addUser(addSpaceUserMessage.user);
                    break;
                }
                case "updateSpaceUserMessage": {
                    const updateSpaceUserMessage = noUndefined(message.message.updateSpaceUserMessage);
                    try {
                        this.updateUser(updateSpaceUserMessage.user, updateSpaceUserMessage.updateMask);
                    } catch (err) {
                        console.warn("User not found, maybe left the space", err);
                    }
                    break;
                }
                case "removeSpaceUserMessage": {
                    this.removeUser(message.message.removeSpaceUserMessage.spaceUserId);
                    break;
                }
                case "updateSpaceMetadataMessage": {
                    const updateSpaceMetadataMessage = message.message.updateSpaceMetadataMessage;

                    const isMetadata = z
                        .record(z.string(), z.unknown())
                        .safeParse(JSON.parse(updateSpaceMetadataMessage.metadata));
                    if (!isMetadata.success) {
                        Sentry.captureException(`Invalid metadata received. ${updateSpaceMetadataMessage.metadata}`);
                        console.error("Invalid metadata received.", updateSpaceMetadataMessage.metadata);
                        return;
                    }
                    this.updateMetadata(isMetadata.data);
                    break;
                }
                case "pingMessage": {
                    throw new Error(`${message.message.$case} should not be received by the dispatcher`);
                }
                case "kickOffMessage": {
                    debug("[space] kickOffSMessage received");
                    this._space.forwarder.forwardMessageToSpaceBack({
                        $case: "kickOffMessage",
                        kickOffMessage: {
                            userId: message.message.kickOffMessage.userId,
                            spaceName: message.message.kickOffMessage.spaceName,
                        },
                    });
                    break;
                }
                case "publicEvent": {
                    debug("[space] publicEvent received");
                    this.sendPublicEvent(noUndefined(message.message.publicEvent));
                    break;
                }
                case "privateEvent": {
                    debug("[space] privateEvent received");
                    const privateEvent = message.message.privateEvent;
                    this.sendPrivateEvent(noUndefined(privateEvent));
                    break;
                }
                case "spaceAnswerMessage": {
                    if (message.message.spaceAnswerMessage.answer === undefined) {
                        console.error("Invalid message received. Answer missing.", message.message.spaceAnswerMessage);
                        throw new Error("Invalid message received. Answer missing.");
                    }
                    this._space.query.receiveAnswer(
                        message.message.spaceAnswerMessage.id,
                        message.message.spaceAnswerMessage.answer
                    );
                    break;
                }
                default: {
                    const _exhaustiveCheck: never = message.message;
                }
            }
        } catch (error) {
            console.error(error);
            Sentry.captureException(error);
        }
    }

    // This function is called when we received a message from the back (initialization of the user list)
    private initSpaceUsersMessage(spaceUsers: SpaceUser[]) {
        for (const spaceUser of spaceUsers) {
            if (this._space.users.has(spaceUser.spaceUserId)) {
                throw new Error(
                    `During init... user ${spaceUser.spaceUserId} already exists in space ${this._space.name}`
                );
            }

            // Check if this is a local user - if so, reuse the existing object from _localConnectedUserWithSpaceUser
            // This ensures both maps point to the same object and updates are synchronized
            const localSocket = this._space._localConnectedUser.get(spaceUser.spaceUserId);
            let user: SpaceUserExtended;

            if (localSocket) {
                const existingLocalUser = this._space._localConnectedUserWithSpaceUser.get(localSocket);
                if (existingLocalUser) {
                    // Reuse the existing local user object and merge any updates from the back
                    merge(existingLocalUser, spaceUser);
                    user = existingLocalUser;
                } else {
                    // Shouldn't happen, but fallback to creating a new object
                    user = { ...spaceUser, lowercaseName: spaceUser.name.toLowerCase() };
                }
            } else {
                // Remote user - create a new object
                user = { ...spaceUser, lowercaseName: spaceUser.name.toLowerCase() };
            }

            this._space.users.set(spaceUser.spaceUserId, user);
            debug(`${this._space.name} : user added during init ${spaceUser.spaceUserId}.`);
        }
        debug(`${this._space.name} : init done. User count ${this._space.users.size}`);
        this.initDeferred.resolve();
    }

    // This function is called when we received a message from the back
    private addUser(spaceUser: SpaceUser) {

        if (this._space.users.has(spaceUser.spaceUserId)) {
            console.warn(`User ${spaceUser.spaceUserId} already exists in space ${this._space.name}`); // Probably already added
            return;
        }

        // Check if this is a local user - if so, reuse the existing object from _localConnectedUserWithSpaceUser
        // This ensures both maps point to the same object and updates are synchronized
        const localSocket = this._space._localConnectedUser.get(spaceUser.spaceUserId);
        let user: SpaceUserExtended;

        if (localSocket) {
            const existingLocalUser = this._space._localConnectedUserWithSpaceUser.get(localSocket);
            if (existingLocalUser) {
                console.log(`[addUser] Local user found in _localConnectedUserWithSpaceUser BEFORE merge:`, {
                    megaphoneState: existingLocalUser.megaphoneState,
                    attendeesState: existingLocalUser.attendeesState,
                });
                // Reuse the existing local user object and merge any updates from the back
                merge(existingLocalUser, spaceUser);
                user = existingLocalUser;
                console.log(`[addUser] Local user AFTER merge:`, {
                    megaphoneState: user.megaphoneState,
                    attendeesState: user.attendeesState,
                    role: this.getUserRole(user),
                });
            } else {
                // Shouldn't happen, but fallback to creating a new object
                console.log(`[addUser] Local socket found but no user in _localConnectedUserWithSpaceUser - creating new object`);
                user = { ...spaceUser, lowercaseName: spaceUser.name.toLowerCase() };
            }
        } else {
            // Remote user - create a new object
            console.log(`[addUser] Remote user - creating new object`);
            user = { ...spaceUser, lowercaseName: spaceUser.name.toLowerCase() };
        }

        this._space.users.set(spaceUser.spaceUserId, user);

        // For LIVE_STREAMING_USERS_WITH_FEEDBACK, notify based on the new user's role
        if (this._space.filterType === FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK) {
            this.notifyAddUserWithFiltering(user);
            return;
        }

        const subMessage: SubMessage = {
            message: {
                $case: "addSpaceUserMessage",
                addSpaceUserMessage: {
                    spaceName: this._space.localName,
                    user: spaceUser,
                },
            },
        };
        this.notifyAll(subMessage);
    }

    /**
     * Notify watchers about a new user for LIVE_STREAMING_USERS_WITH_FEEDBACK.
     * This method handles two things in a single loop:
     * 1. Send existing users to the new user (if they are a local watcher)
     * 2. Notify other watchers about the new user
     */

    private notifyAddUserWithFiltering(newUser: SpaceUserExtended) {
        const newUserRole = this.getUserRole(newUser);


        // Prepare the message for notifying other watchers about the new user
        const newUserMessage = newUserRole !== "none" ? this.createAddUserMessage(newUser) : undefined;

        // Single loop: iterate over all watchers to handle both directions
        this._space._localWatchers.forEach((watcherId) => {
            const watcher = this._space._localConnectedUser.get(watcherId);
            if (!watcher) {
                console.error(`Watcher ${watcherId} not found`);
                Sentry.captureException(`Watcher ${watcherId} not found`);
                return;
            }

            const observer = this._space._localConnectedUserWithSpaceUser.get(watcher);
            if (!observer) {
                console.error(`Observer not found for watcher ${watcherId}`);
                return;
            }

            // Case 1: This watcher IS the new user → send them all existing users they can see
            if (watcherId === newUser.spaceUserId) {
                if (newUserRole !== "none") {
                    this.sendExistingUsersToWatcher(watcher, newUser);
                }
                return;
            }

            // Case 2: This watcher is NOT the new user → notify them about the new user if they can see them
            const canSee = this.shouldObserverSeeUser(observer, newUser);
            if (newUserMessage && canSee) {
                this.notifyMe(watcher, newUserMessage);
            }
        });
    }

    /**
     * Send all existing users that a watcher can see.
     * Used when a new user is added and they are already a watcher.
     */
    private sendExistingUsersToWatcher(watcher: Socket, observer: SpaceUserExtended) {

        for (const [spaceUserId, existingUser] of this._space.users.entries()) {
            // Skip the observer themselves
            if (spaceUserId === observer.spaceUserId) {
                continue;
            }

            const canSee = this.shouldObserverSeeUser(observer, existingUser);

            // Check if the observer can see this existing user
            if (canSee) {
                this.notifyMe(watcher, this.createAddUserMessage(existingUser));
            }
        }
    }

    // This function is called when we received a message from the back
    private updateUser(spaceUser: PartialSpaceUser, updateMask: string[]) {
        const user = this._space.users.get(spaceUser.spaceUserId);
        if (!user) {
            throw new Error(`User not found in this space ${spaceUser.spaceUserId}`);
        }

        // For LIVE_STREAMING_USERS_WITH_FEEDBACK, track role changes BEFORE applying the update
        const previousRole = this.getUserRole(user);


        const updateValues = applyFieldMask(spaceUser, updateMask);
        merge(user, updateValues);


        if (spaceUser.name) user.lowercaseName = spaceUser.name.toLowerCase();
        debug(`${this._space.name} : user updated ${spaceUser.spaceUserId}`);

        // For LIVE_STREAMING_USERS_WITH_FEEDBACK, handle role transitions
        if (this._space.filterType === FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK) {
            const newRole = this.getUserRole(user);

            // If role changed, handle the transition specially
            if (previousRole !== newRole) {
                this.handleRoleChange(user, previousRole, newRole, updateMask);
                return;
            }

            // Role didn't change, but we still need to filter updates
            this.notifyUpdateUserWithFiltering(user, updateMask);
            return;
        }

        const subMessage: SubMessage = {
            message: {
                $case: "updateSpaceUserMessage",
                updateSpaceUserMessage: {
                    spaceName: this._space.localName,
                    user: this.toSpaceUser(user),
                    updateMask,
                },
            },
        };
        this.notifyAll(subMessage);
    }

    /**
     * Notify watchers about a user update for LIVE_STREAMING_USERS_WITH_FEEDBACK (when role didn't change).
     */
    private notifyUpdateUserWithFiltering(user: SpaceUserExtended, updateMask: string[]) {
        const subMessage = this.createUpdateUserMessage(user, updateMask);

        this._space._localWatchers.forEach((watcherId) => {
            const watcher = this._space._localConnectedUser.get(watcherId);
            if (!watcher) {
                console.error(`Watcher ${watcherId} not found`);
                Sentry.captureException(`Watcher ${watcherId} not found`);
                return;
            }

            const observer = this._space._localConnectedUserWithSpaceUser.get(watcher);
            if (!observer) {
                console.error(`Observer not found for watcher ${watcherId}`);
                return;
            }

            if (!this.shouldObserverSeeUser(observer, user)) {
                return;
            }

            this.notifyMe(watcher, subMessage);
        });
    }

    // ==================== Role Change Handling ====================

    /**
     * Handles role transitions for LIVE_STREAMING_USERS_WITH_FEEDBACK.
     * Possible transitions:
     * - none → speaker: User becomes visible to everyone
     * - none → listener: User becomes visible to speakers only
     * - speaker → none: User becomes invisible to everyone
     * - speaker → listener: User becomes invisible to other listeners
     * - listener → none: User becomes invisible to everyone
     * - listener → speaker: User becomes visible to other listeners
     */
    private handleRoleChange(
        user: SpaceUserExtended,
        previousRole: UserRole,
        newRole: UserRole,
        updateMask: string[]
    ) {

        // Find the socket for the user who changed role by iterating through _localConnectedUserWithSpaceUser
        // This is more robust than using _localConnectedUser.get() which might use a different key
        let selfSocket: Socket | undefined;
        for (const [socket, spaceUser] of this._space._localConnectedUserWithSpaceUser.entries()) {
            if (spaceUser.spaceUserId === user.spaceUserId) {
                selfSocket = socket;
                break;
            }
        }

        const isWatcher = this._space._localWatchers.has(user.spaceUserId);
        debug(
            `${this._space.name} : user ${user.spaceUserId} selfSocket=${!!selfSocket}, isWatcher=${isWatcher}`
        );

        // First, handle the user who changed role (update their view of other users)
        // Only if they are a watcher (they should receive user list updates)
        if (selfSocket && isWatcher) {
            this.handleSelfRoleChange(selfSocket, user, previousRole, newRole);
        }

        // Then, notify all OTHER watchers about this user's role change
        this._space._localWatchers.forEach((watcherId) => {
            // Skip the user who changed role (already handled above)
            if (watcherId === user.spaceUserId) {
                return;
            }

            const watcher = this._space._localConnectedUser.get(watcherId);
            if (!watcher) {
                console.error(`Watcher ${watcherId} not found`);
                Sentry.captureException(`Watcher ${watcherId} not found`);
                return;
            }

            const observerFromLocalConnected = this._space._localConnectedUserWithSpaceUser.get(watcher);
            const observer = observerFromLocalConnected;
            if (!observer) {
                console.error(`Observer not found for watcher ${watcherId}`);
                return;
            }

            const observerRole = this.getUserRole(observer);
            debug(
                `${this._space.name} : notifying watcher ${watcherId} (role=${observerRole}) about ${user.spaceUserId} role change`
            );
            this.handleOtherWatcherNotification(watcher, observerRole, user, previousRole, newRole, updateMask);
        });
    }


    /**
     * When a user's role changes, update their view of other users.
     */
    private handleSelfRoleChange(
        watcher: Socket,
        user: SpaceUserExtended,
        previousRole: UserRole,
        newRole: UserRole
    ) {
        debug(
            `${this._space.name} : handleSelfRoleChange for ${user.spaceUserId}, users count: ${this._space.users.size}`
        );

        // Determine which users were visible before and after the role change
        for (const [spaceUserId, existingUser] of this._space.users.entries()) {
            if (spaceUserId === user.spaceUserId) continue;

            const existingUserRole = this.getUserRole(existingUser);

            
            const wasVisible = this.couldRoleSeeRole(previousRole, existingUserRole);
            const isVisible = this.couldRoleSeeRole(newRole, existingUserRole);


            if (!wasVisible && isVisible) {
                // User becomes visible → send add
                this.notifyMe(watcher, this.createAddUserMessage(existingUser));
            } else if (wasVisible && !isVisible) {
                // User becomes invisible → send remove
                this.notifyMe(watcher, this.createRemoveUserMessage(existingUser.spaceUserId));
            }
            // If visibility didn't change, no notification needed
        }
    }

    /**
     * Notify another watcher about a user's role change.
     */

    private handleOtherWatcherNotification(
        watcher: Socket,
        observerRole: UserRole,
        user: SpaceUserExtended,
        previousRole: UserRole,
        newRole: UserRole,
        updateMask: string[]
    ) {
        const wasVisible = this.couldRoleSeeRole(observerRole, previousRole);
        const isVisible = this.couldRoleSeeRole(observerRole, newRole);

        debug(
            `${this._space.name} : handleOtherWatcherNotification observer(${observerRole}) -> user ${user.spaceUserId} (${previousRole}->${newRole}): wasVisible=${wasVisible}, isVisible=${isVisible}`
        );

        if (!wasVisible && isVisible) {
            // User becomes visible to this observer → send add
            debug(`${this._space.name} : sending add for ${user.spaceUserId} to observer`);
            this.notifyMe(watcher, this.createAddUserMessage(user));
        } else if (wasVisible && !isVisible) {
            // User becomes invisible to this observer → send remove
            debug(`${this._space.name} : sending remove for ${user.spaceUserId} to observer`);
            this.notifyMe(watcher, this.createRemoveUserMessage(user.spaceUserId));
        } else if (wasVisible && isVisible) {
            // User was and still is visible → send update
            debug(`${this._space.name} : sending update for ${user.spaceUserId} to observer`);
            this.notifyMe(watcher, this.createUpdateUserMessage(user, updateMask));
        }
        // If user was invisible and still is, no notification needed
    }

    
    private createAddUserMessage(user: SpaceUserExtended): SubMessage {
        return {
            message: {
                $case: "addSpaceUserMessage",
                addSpaceUserMessage: {
                    spaceName: this._space.localName,
                    user: this.toSpaceUser(user),
                },
            },
        };
    }

    private createUpdateUserMessage(user: SpaceUserExtended, updateMask: string[]): SubMessage {
        return {
            message: {
                $case: "updateSpaceUserMessage",
                updateSpaceUserMessage: {
                    spaceName: this._space.localName,
                    user: this.toSpaceUser(user),
                    updateMask,
                },
            },
        };
    }

    private createRemoveUserMessage(spaceUserId: string): SubMessage {
        return {
            message: {
                $case: "removeSpaceUserMessage",
                removeSpaceUserMessage: {
                    spaceName: this._space.localName,
                    spaceUserId,
                },
            },
        };
    }

    // This function is called when we received a message from the back
    private removeUser(spaceUserId: string) {
        const user = this._space.users.get(spaceUserId);
        if (user) {
            // For LIVE_STREAMING_USERS_WITH_FEEDBACK, we need to notify watchers based on the user's megaphoneState
            // before removing the user from the map

                const subMessage: SubMessage = {
                    message: {
                        $case: "removeSpaceUserMessage",
                        removeSpaceUserMessage: {
                            spaceName: this._space.localName,
                            spaceUserId,
                        },
                    },
                };
                this.notifyAll(subMessage);

            this._space.users.delete(spaceUserId);
            debug(`${this._space.name} : user removed ${spaceUserId}. User count ${this._space.users.size}`);
        } else {
            console.warn(`User not found in this space ${spaceUserId}`); // Probably already removed
        }
    }

    /**
     * Notify watchers about a user removal for LIVE_STREAMING_USERS_WITH_FEEDBACK.
     * This method uses the user object before it's deleted to properly filter notifications.
     * - If the removed user was a speaker → notify all watchers (speakers + listeners)
     * - If the removed user was a listener → notify only speakers
     * - If the removed user was neither → notify no one (they were invisible anyway)
     */
    /**
     * Notify all watchers about a user removal.
     * We send the remove message to ALL watchers because:
     * - The user's role might have changed before removal
     * - It's safer to send to everyone and let the frontend ignore unknown users
     */
    private notifyRemoveUserWithFiltering(removedUser: SpaceUserExtended) {
        const subMessage = this.createRemoveUserMessage(removedUser.spaceUserId);

        this._space._localWatchers.forEach((watcherId) => {
            const watcher = this._space._localConnectedUser.get(watcherId);
            if (!watcher) {
                console.error(`Watcher ${watcherId} not found`);
                Sentry.captureException(`Watcher ${watcherId} not found`);
                return;
            }

            this.notifyMe(watcher, subMessage);
        });
    }

    private updateMetadata(metadata: { [key: string]: unknown }) {
        // Set all value of metadata in the space
        for (const [key, value] of Object.entries(metadata)) {
            this._space.metadata.set(key, value);
        }

        const subMessage: SubMessage = {
            message: {
                $case: "updateSpaceMetadataMessage",
                updateSpaceMetadataMessage: {
                    spaceName: this._space.localName,
                    metadata: JSON.stringify(metadata),
                },
            },
        };
        this.notifyAllMetadata(subMessage);
    }

    private notifyAllMetadata(subMessage: SubMessage) {
        this._space._localConnectedUser.forEach((watcher) => {
            const socketData = watcher.getUserData();
            if (subMessage.message?.$case === "updateSpaceMetadataMessage") {
                debug(`${this._space.name} : metadata update sent to ${socketData.name}`);
                subMessage.message.updateSpaceMetadataMessage.spaceName = this._space.localName;

                socketData.emitInBatch(subMessage);
            }
        });
    }

    // ==================== Role Helpers ====================

    /**
     * Determines if a user is a speaker (megaphoneState = true).
     */
    private isSpeaker(user: SpaceUser | SpaceUserExtended): boolean {
        return user.megaphoneState === true;
    }

    /**
     * Determines if a user is a listener (attendeesState = true AND megaphoneState = false).
     */
    private isListener(user: SpaceUser | SpaceUserExtended): boolean {
        return user.attendeesState === true && user.megaphoneState !== true;
    }

    /**
     * Determines the role of a user for LIVE_STREAMING_USERS_WITH_FEEDBACK filtering.
     */
    private getUserRole(user: SpaceUser | SpaceUserExtended): UserRole {
        if (this.isSpeaker(user)) return "speaker";
        if (this.isListener(user)) return "listener";
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

    /**
     * Checks if an observer should see a specific user based on the filter type.
     * For LIVE_STREAMING_USERS_WITH_FEEDBACK:
     * - Speakers (megaphoneState=true) see everyone (speakers + listeners)
     * - Listeners (attendeesState=true, megaphoneState=false) only see speakers
     * - Neither (megaphoneState=false, attendeesState=false) see nothing
     */
    private shouldObserverSeeUser(observer: SpaceUserExtended, targetUser: SpaceUser | SpaceUserExtended): boolean {
        if (this._space.filterType !== FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK) {
            return true;
        }

        const observerRole = this.getUserRole(observer);
        const targetRole = this.getUserRole(targetUser);

        return this.couldRoleSeeRole(observerRole, targetRole);
    }

    /**
     * Notify all watchers in this space. Notification is done only to watchers.
     * For LIVE_STREAMING_USERS_WITH_FEEDBACK, use the specific notifyXxxWithFiltering methods instead
     * for add/update/remove user messages.
     */
    public notifyAll(subMessage: SubMessage) {
        this._space._localWatchers.forEach((watcherId) => {
            const watcher = this._space._localConnectedUser.get(watcherId);

            if (!watcher) {
                console.error(`Watcher ${watcherId} not found`);
                Sentry.captureException(`Watcher ${watcherId} not found`);
                return;
            }

            this.notifyMe(watcher, subMessage);
        });
    }

    /**
     * Notify everybody in this space, including non-watchers. Used to propagate the "disconnect" message.
     */
    public notifyAllIncludingNonWatchers(subMessage: SubMessage) {
        this._space._localConnectedUser.forEach((socket) => {
            this.notifyMe(socket, subMessage);
        });
    }

    public notifyMe(watcher: Socket, subMessage: SubMessage) {
        watcher.getUserData().emitInBatch(subMessage);
    }

    public notifyMeAddUser(watcher: Socket, user: SpaceUserExtended) {
        const subMessage: SubMessage = {
            message: {
                $case: "addSpaceUserMessage",
                addSpaceUserMessage: {
                    spaceName: this._space.localName,
                    user,
                },
            },
        };
        this.notifyMe(watcher, subMessage);
    }

    public async notifyMeInit(watcher: Socket) {
        await this.waitForInit();

        let users = Array.from(this._space.users.values());

        // For LIVE_STREAMING_USERS_WITH_FEEDBACK, filter users based on observer's role:
        // - Speakers see everyone (speakers + listeners)
        // - Listeners see only speakers
        // - Neither sees no one
        if (this._space.filterType === FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK) {
            const observer = this._space._localConnectedUserWithSpaceUser.get(watcher);
            if (observer) {
                users = users.filter((user) => this.shouldObserverSeeUser(observer, user));
            }
        }

        const subMessage: SubMessage = {
            message: {
                $case: "initSpaceUsersMessage",
                initSpaceUsersMessage: {
                    spaceName: this._space.localName,
                    users,
                    metadata: JSON.stringify(Object.fromEntries(this._space.metadata)),
                },
            },
        };
        this.notifyMe(watcher, subMessage);
    }

    private sendPublicEvent(message: NonUndefinedFields<PublicEvent>) {
        const spaceEvent = noUndefined(message.spaceEvent);

        // FIXME: this should be unnecessary because of the noUndefined call above
        // noUndefined does not seem to return an appropriate type
        if (!spaceEvent.event) {
            throw new Error("Event is required in spaceEvent");
        }

        this.notifyAllUsers(
            {
                message: {
                    $case: "publicEvent",
                    publicEvent: {
                        senderUserId: message.senderUserId,
                        spaceEvent: {
                            event: spaceEvent.event,
                        },
                        // The name of the space in the browser is the local name (i.e. the name without the "world" prefix)
                        spaceName: this._space.localName,
                    },
                },
            },
            message.senderUserId
        );
    }

    private sendPrivateEvent(message: NonUndefinedFields<PrivateEventBackToPusher>) {
        const spaceEvent = noUndefined(message.spaceEvent);

        // FIXME: this should be unnecessary because of the noUndefined call above
        // noUndefined does not seem to return an appropriate type
        if (!spaceEvent.event) {
            throw new Error("Event is required in spaceEvent");
        }

        const receiver = this._space._localConnectedUser.get(message.receiverUserId);

        if (!receiver) {
            console.warn(
                `Private message receiver ${message.receiverUserId} not found in space ${this._space.name}. Possibly disconnected or left the space.`
            );
            return;
        }

        const receiverSpaceUser = this._space._localConnectedUserWithSpaceUser.get(receiver);
        if (!receiverSpaceUser) {
            console.warn(
                `Private message receiver ${message.receiverUserId} not found in space ${this._space.name}. Possibly disconnected or left the space.`
            );
            return;
        }

        const receiverSocket = this._space._localConnectedUser.get(message.receiverUserId);

        if (!receiverSocket) {
            console.warn(`Private message receiver ${message.receiverUserId} not connected to this pusher`);
            return;
        }

        const extendedSender = {
            ...message.sender,
            lowercaseName: message.sender.name.toLowerCase(),
        };

        receiverSocket.getUserData().emitInBatch({
            message: {
                $case: "privateEvent",
                privateEvent: {
                    sender: extendedSender,
                    receiverUserId: message.receiverUserId,
                    spaceEvent: {
                        event: this.eventProcessor.processPrivateEvent(spaceEvent.event, extendedSender),
                    },
                    // The name of the space in the browser is the local name (i.e. the name without the "world" prefix)
                    spaceName: this._space.localName,
                },
            },
        });
    }
    /**
     * Notify all users in this space expect the sender. Notification is done despite users watching or not.
     * It is used solely for public events.
     */
    private notifyAllUsers(subMessage: SubMessage, senderId: string) {
        for (const [socket, spaceUser] of this._space._localConnectedUserWithSpaceUser.entries()) {
            if (spaceUser.spaceUserId !== senderId) {
                socket.getUserData().emitInBatch(subMessage);
            }
        }
    }

    private waitForInit(): Promise<void> {
        return this.initDeferred.promise;
    }

    /**
     * Converts a SpaceUserExtended to a SpaceUser by removing the extra properties.
     */
    private toSpaceUser(user: SpaceUserExtended): SpaceUser {
        // Destructure to remove lowercaseName and keep only SpaceUser properties
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { lowercaseName, ...spaceUser } = user;
        return SpaceUser.fromPartial(spaceUser);
    }
}
