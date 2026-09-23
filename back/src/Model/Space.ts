import { applyFieldMask } from "protobuf-fieldmask";
import { deepmergeInto } from "deepmerge-ts";
import * as Sentry from "@sentry/node";
import type {
    BackEventMessage,
    BackToPusherSpaceMessage,
    HandleLivekitWebhookRequest,
    PrivateEvent,
    PublicEvent,
    SpaceAnswerMessage,
    SpaceQueryMessage,
    SpaceUser,
} from "@workadventure/messages";
import {
    AddSpaceUserMessage,
    FilterType,
    RemoveSpaceUserMessage,
    UpdateSpaceMetadataMessage,
} from "@workadventure/messages";
import Debug from "debug";
import { asError } from "catch-unknown";
import { clientEventsEmitter } from "../Services/ClientEventsEmitter";
import type { SessionEndReason } from "./SessionAnalytics";
import type { CustomJsonReplacerInterface } from "./CustomJsonReplacerInterface";
import type { SpacesWatcher } from "./SpacesWatcher";
import type { EventProcessor } from "./EventProcessor";
import { CommunicationManager } from "./CommunicationManager";
import type { ICommunicationManager } from "./Interfaces/ICommunicationManager";
import type { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";
import type { ManagedRecordingState } from "./RecordingManager";
import { metadataProcessor } from "./MetadataProcessorInit";

const debug = Debug("space");

type Filter = Exclude<FilterType, FilterType.UNRECOGNIZED>;

/**
 * How long the back keeps the place of users whose pusher went away without a goodbye (a play pod restarting or
 * crashing). The same browser tab reconnecting through another pusher within that time takes its place back:
 * nobody sees it leave, and the LiveKit room is not torn down under the others' feet.
 * Matches the pusher's own retention of a dropped WebSocket (CLIENT_DISCONNECTION_RETENTION_MS).
 */
export const DETACHED_USER_GRACE_MS = 30_000;

interface DetachedUser {
    user?: SpaceUser;
    userToNotify?: SpaceUser;
    timer: NodeJS.Timeout;
}

export class Space implements CustomJsonReplacerInterface, ICommunicationSpace {
    readonly name: string;
    private users: Map<SpacesWatcher, Map<string, SpaceUser>>;
    private metadata: Map<string, unknown>;
    private communicationManager: ICommunicationManager;
    private usersToNotify: Map<SpacesWatcher, Map<string, SpaceUser>>;
    // Still present for everyone (counters, communication, other fronts), but reachable through no pusher yet.
    private readonly detachedUsers = new Map<string, DetachedUser>();
    // Number of users publishing at least one stream (camera, screen or microphone)
    private _nbPublishers = 0;
    // Number of users (number of users in this space)
    private _nbUsers = 0;
    // If there is at least one publishers, nbWatchers = nbUsers. Otherwise nbWatchers = 0
    private _nbWatchers = 0;

    constructor(
        name: string,
        private _filterType: Filter,
        private eventProcessor: EventProcessor,
        private _propertiesToSync: string[],
        public readonly world: string,
        private _spaceUpdatedSubject = clientEventsEmitter.spaceUpdatedSubject,
    ) {
        this.name = name;
        this.users = new Map<SpacesWatcher, Map<SpaceUser["spaceUserId"], SpaceUser>>();
        //equivalent of watchers in the pusher
        this.usersToNotify = new Map<SpacesWatcher, Map<SpaceUser["spaceUserId"], SpaceUser>>();
        this.metadata = new Map<string, unknown>();
        this.communicationManager = new CommunicationManager(this);
        debug(`${name} => created`);
    }

    public addUser(sourceWatcher: SpacesWatcher, spaceUser: SpaceUser): void {
        const detached = this.detachedUsers.get(spaceUser.spaceUserId);
        if (detached?.user) {
            const previous = detached.user;
            detached.user = undefined;
            this.reattachUser(sourceWatcher, previous, spaceUser);
            this.settleDetachedUser(spaceUser.spaceUserId, detached);
            return;
        }
        // The same tab reconnected through another pusher while its old one is still alive: move it over, or the
        // old pusher removing it later would remove the user that just came back.
        const stale = this.takeFromOtherWatcher(this.users, sourceWatcher, spaceUser.spaceUserId);
        if (stale) {
            this.reattachUser(sourceWatcher, stale, spaceUser);
            this.communicationManager.handleUserReconnected(this.getUser(spaceUser.spaceUserId) ?? spaceUser);
            return;
        }
        try {
            const usersList = this.usersList(sourceWatcher);
            usersList.set(spaceUser.spaceUserId, spaceUser);
            this._nbUsers++;
            if (this.isPublishing(spaceUser)) {
                this._nbPublishers++;
            }
            if (this._nbPublishers > 0) {
                this._nbWatchers = this._nbUsers;
            }
            this._spaceUpdatedSubject.next(this);

            if (!this.filterOneUser(spaceUser)) {
                return;
            }

            this.notifyWatchers({
                message: {
                    $case: "addSpaceUserMessage",
                    addSpaceUserMessage: AddSpaceUserMessage.fromPartial({
                        spaceName: this.name,
                        user: spaceUser,
                    }),
                },
            });

            this.communicationManager.handleUserAdded(spaceUser).catch((e) => {
                Sentry.captureException(e);
                console.error(e);
            });
            debug(`${this.name} : user => added ${spaceUser.spaceUserId}`);
        } catch (e) {
            console.error("Error while adding user", e);
            Sentry.captureException(e);
            debug("Error while adding user", e);
            // If we have an error, it means that the user list is not initialized
            // So we need to remove user from the source watcher
            this.removeUser(sourceWatcher, spaceUser.spaceUserId);
            throw e;
        }
    }

    public updateUser(sourceWatcher: SpacesWatcher, spaceUser: SpaceUser, updateMask: string[]) {
        try {
            const usersList = this.usersList(sourceWatcher);
            const user = usersList.get(spaceUser.spaceUserId);
            if (!user) {
                console.error("User not found in this space", spaceUser);
                return;
            }

            if (this.isPublishing(user)) {
                this._nbPublishers--;
            }

            const oldFilter = this.filterOneUser(user);

            const updateValues = applyFieldMask(spaceUser, updateMask);
            deepmergeInto(user, updateValues);

            // Only the megaphone: `attendeesState` is the audience choosing to be seen,
            // not a speaker going on air. In a meeting, present is active.
            if (this.isBroadcast) {
                this.communicationManager.handleMemberActiveChanged(user.spaceUserId, user.megaphoneState);
            }

            const newFilter = this.filterOneUser(user);

            usersList.set(spaceUser.spaceUserId, user);

            if (this.isPublishing(user)) {
                this._nbPublishers++;
            }
            if (this._nbPublishers > 0) {
                this._nbWatchers = this._nbUsers;
            } else {
                this._nbWatchers = 0;
            }
            this._spaceUpdatedSubject.next(this);

            if (!oldFilter && newFilter) {
                debug(`${this.name} : user updated => added ${user.spaceUserId} updateMask : ${updateMask.join(", ")}`);
                this.notifyWatchers({
                    message: {
                        $case: "addSpaceUserMessage",
                        addSpaceUserMessage: AddSpaceUserMessage.fromPartial({
                            spaceName: this.name,
                            user,
                        }),
                    },
                });

                this.communicationManager.handleUserAdded(user).catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
                });
            } else if (oldFilter && !newFilter) {
                debug(
                    `${this.name} : user updated => removed ${user.spaceUserId} updateMask : ${updateMask.join(", ")}`,
                );

                this.communicationManager.handleUserDeleted(user).catch((error) => {
                    console.error("Error while deleting user", error);
                    Sentry.captureException(error);
                });

                this.notifyWatchers({
                    message: {
                        $case: "removeSpaceUserMessage",
                        removeSpaceUserMessage: RemoveSpaceUserMessage.fromPartial({
                            spaceName: this.name,
                            spaceUserId: user.spaceUserId,
                        }),
                    },
                });
            } else if (oldFilter !== false && newFilter !== false) {
                debug(
                    `${this.name} : user updated => updated ${user.spaceUserId} updateMask : ${updateMask.join(
                        ", ",
                    )} in space ${this.name}`,
                );
                this.notifyWatchers({
                    message: {
                        $case: "updateSpaceUserMessage",
                        updateSpaceUserMessage: {
                            spaceName: this.name,
                            user: spaceUser,
                            updateMask,
                        },
                    },
                });

                this.communicationManager.handleUserUpdated(user, updateMask).catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
                });
            }
        } catch (e) {
            console.error("Error while updating user", e);
            Sentry.captureException(e);
            debug("Error while updating user", e);
            // If we have an error, it means that the user list is not initialized
            // So we need to remove user from the source watcher
            this.removeUser(sourceWatcher, spaceUser.spaceUserId);
        }
    }

    public removeUser(sourceWatcher: SpacesWatcher, spaceUserId: string): void {
        let user: SpaceUser | undefined;
        let wasToNotify = false;
        try {
            const usersList = this.usersList(sourceWatcher);
            user = usersList.get(spaceUserId);

            if (!user) {
                console.error("User not found in this space", spaceUserId);
                return;
            }

            const usersToNotifyList = this.usersListToNotify(sourceWatcher);
            wasToNotify = usersToNotifyList.delete(spaceUserId);

            usersList.delete(spaceUserId);

            if (this.isPublishing(user)) {
                this._nbPublishers--;
            }
            this._nbUsers--;
            if (this._nbPublishers > 0) {
                this._nbWatchers = this._nbUsers;
            } else {
                this._nbWatchers = 0;
            }
            this._spaceUpdatedSubject.next(this);
            debug(`${this.name} : user => removed ${spaceUserId}`);
        } catch (e) {
            console.error("Error while removing user", e);
            Sentry.captureException(e);
            debug("Error while removing user", e);
        } finally {
            // Before handleUserDeleted, and unconditionally: the manager reads presence
            // as the union of its two registries, so a user dropped from one while still
            // in the other has not left. Without this the watching half never empties on
            // a leave and the user stays "present" until their pusher dies.
            if (user && wasToNotify) {
                this.communicationManager.handleUserToNotifyDeleted(user).catch((error) => {
                    console.error("Error while deleting user to notify", error);
                    Sentry.captureException(error);
                });
            }

            if (user && this.filterOneUser(user)) {
                this.communicationManager.handleUserDeleted(user).catch((error) => {
                    console.error("Error while deleting user", error);
                    Sentry.captureException(error);
                });

                this.notifyWatchers({
                    message: {
                        $case: "removeSpaceUserMessage",
                        removeSpaceUserMessage: RemoveSpaceUserMessage.fromPartial({
                            spaceName: this.name,
                            spaceUserId: spaceUserId,
                        }),
                    },
                });
            }

            if (user) {
                this.stopRecordingIfUserCompletelyLeftSpace(user.spaceUserId).catch((error) => {
                    console.error("Error while stopping recording after user removal", error);
                    Sentry.captureException(error);
                });
            }
        }
    }

    public async updateMetadata(metadata: { [key: string]: unknown }, senderId: string) {
        const processedMetadata: { [key: string]: unknown } = {};
        const promises: Promise<void>[] = [];

        for (const key in metadata) {
            promises.push(
                metadataProcessor.processMetadata(key, metadata[key], senderId, this).then((processedValue) => {
                    if (processedValue !== undefined) {
                        processedMetadata[key] = processedValue;
                    }
                }),
            );
        }

        await Promise.allSettled(promises);

        this.publishMetadata(processedMetadata);
    }

    private filterOneUser(user: SpaceUser): boolean {
        switch (this._filterType) {
            case FilterType.ALL_USERS: {
                return true;
            }
            case FilterType.LIVE_STREAMING_USERS: {
                return user.megaphoneState;
            }
            case FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK: {
                return user.megaphoneState || user.attendeesState;
            }
            default: {
                const _exhaustiveCheck: never = this._filterType;
            }
        }
        return false;
    }

    public addWatcher(watcher: SpacesWatcher) {
        this.users.set(watcher, new Map<string, SpaceUser>());
        this.usersToNotify.set(watcher, new Map<string, SpaceUser>());
        debug(`Space ${this.name} => watcher added ${watcher.id}`);

        const allSpaceUsers: SpaceUser[] = [];
        for (const spaceUsers of this.users.values()) {
            const filteredSpaceUsers = Array.from(spaceUsers.values()).filter((user) => this.filterOneUser(user));
            allSpaceUsers.push(...filteredSpaceUsers);
        }
        // Detached users are still present: a watcher that does not know them could not follow their reattachment.
        for (const { user } of this.detachedUsers.values()) {
            if (user && this.filterOneUser(user)) {
                allSpaceUsers.push(user);
            }
        }

        const metadata: { [key: string]: unknown } = {};

        for (const key of this.metadata.keys()) {
            metadata[key] = this.metadata.get(key);
        }

        watcher.write({
            message: {
                $case: "initSpaceUsersMessage",
                initSpaceUsersMessage: {
                    spaceName: this.name,
                    users: allSpaceUsers,
                    metadata: JSON.stringify(metadata),
                },
            },
        });
    }

    public removeWatcher(watcher: SpacesWatcher) {
        const spaceUsers = this.users.get(watcher);
        const spaceUsersToNotify = this.usersToNotify.get(watcher);

        this.users.delete(watcher);
        this.usersToNotify.delete(watcher);

        const impactedUserIds = new Set<string>([
            ...(spaceUsers ? Array.from(spaceUsers.keys()) : []),
            ...(spaceUsersToNotify ? Array.from(spaceUsersToNotify.keys()) : []),
        ]);

        if (spaceUsers) {
            for (const spaceUser of spaceUsers.values()) {
                // A pusher going away takes its users with it; without this they would
                // stay "present" until the back itself shut down.
                this.communicationManager.handleUserDeleted(spaceUser).catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
                });
            }
        }

        if (spaceUsersToNotify) {
            for (const spaceUser of spaceUsersToNotify.values()) {
                this.communicationManager.handleUserToNotifyDeleted(spaceUser).catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
                });
            }
        }

        for (const spaceUserId of impactedUserIds) {
            this.stopRecordingIfUserCompletelyLeftSpace(spaceUserId).catch((error) => {
                console.error("Error while stopping recording after watcher removal", error);
                Sentry.captureException(error);
            });
        }

        // In case was not empty when it was removed, we need to notify the other watchers
        for (const spaceUser of spaceUsers?.values() || []) {
            if (this.filterOneUser(spaceUser)) {
                debug(
                    `${this.name} => removing space user ${spaceUser.spaceUserId} from watcher ${watcher.id} before removing watcher`,
                );
                this.notifyWatchers({
                    message: {
                        $case: "removeSpaceUserMessage",
                        removeSpaceUserMessage: RemoveSpaceUserMessage.fromPartial({
                            spaceName: this.name,
                            spaceUserId: spaceUser.spaceUserId,
                        }),
                    },
                });
            }
        }

        debug(`${this.name} => watcher removed ${watcher.id}`);
    }

    /**
     * The pusher behind this watcher is gone without saying goodbye. Unlike removeWatcher, its users keep their place
     * for DETACHED_USER_GRACE_MS: the same tab reconnecting through another pusher gets it back (see addUser and
     * addUserToNotify). Those who don't come back leave for good when it runs out, then onGraceOver is called so the
     * space can be deleted if nobody is left.
     */
    public detachWatcher(watcher: SpacesWatcher, onGraceOver: () => void): void {
        const spaceUsers = this.users.get(watcher);
        const spaceUsersToNotify = this.usersToNotify.get(watcher);

        this.users.delete(watcher);
        this.usersToNotify.delete(watcher);

        const detach = (spaceUserId: string): DetachedUser => {
            let detached = this.detachedUsers.get(spaceUserId);
            if (!detached) {
                detached = {
                    timer: setTimeout(() => {
                        this.expireDetachedUser(spaceUserId);
                        onGraceOver();
                    }, DETACHED_USER_GRACE_MS),
                };
                this.detachedUsers.set(spaceUserId, detached);
            }
            return detached;
        };

        for (const spaceUser of spaceUsers?.values() ?? []) {
            detach(spaceUser.spaceUserId).user = spaceUser;
        }
        for (const spaceUser of spaceUsersToNotify?.values() ?? []) {
            detach(spaceUser.spaceUserId).userToNotify = spaceUser;
        }

        debug(`${this.name} => watcher detached ${watcher.id}, ${this.detachedUsers.size} user(s) on hold`);
    }

    /**
     * Puts a detached user back under a live watcher, silently: every watcher already knows it (it was added before,
     * or listed in the initSpaceUsersMessage of watchers that came since). Only what changed with the new connection
     * is sent, as an update.
     */
    private reattachUser(sourceWatcher: SpacesWatcher, previous: SpaceUser, spaceUser: SpaceUser): void {
        this.usersList(sourceWatcher).set(previous.spaceUserId, previous);

        const updateMask: string[] = [];
        for (const key of Object.keys(spaceUser) as (keyof SpaceUser)[]) {
            if (JSON.stringify(previous[key]) === JSON.stringify(spaceUser[key])) {
                continue;
            }
            if (Array.isArray(spaceUser[key])) {
                // updateUser deep-merges, which would concatenate arrays: replace them in place instead.
                Object.assign(previous, { [key]: spaceUser[key] });
                continue;
            }
            updateMask.push(key);
        }

        if (updateMask.length > 0) {
            this.updateUser(sourceWatcher, spaceUser, updateMask);
        }
        debug(`${this.name} : user => reattached ${spaceUser.spaceUserId}`);
    }

    private takeFromOtherWatcher(
        lists: Map<SpacesWatcher, Map<string, SpaceUser>>,
        sourceWatcher: SpacesWatcher,
        spaceUserId: string,
    ): SpaceUser | undefined {
        for (const [watcher, list] of lists) {
            if (watcher === sourceWatcher) {
                continue;
            }
            const user = list.get(spaceUserId);
            if (user) {
                list.delete(spaceUserId);
                return user;
            }
        }
        return undefined;
    }

    /**
     * Once every part of a detached user is back, it is whole again: its front, which lost its media when its pusher
     * went away, is told to signal them anew.
     */
    private settleDetachedUser(spaceUserId: string, detached: DetachedUser): void {
        if (detached.user || detached.userToNotify) {
            return;
        }
        clearTimeout(detached.timer);
        this.detachedUsers.delete(spaceUserId);

        const user = this.getUser(spaceUserId) ?? this.getUsersToNotify().find((u) => u.spaceUserId === spaceUserId);
        if (user) {
            this.communicationManager.handleUserReconnected(user);
        }
    }

    /**
     * The grace period ran out: what removeUser and deleteUserToNotify would have done at the time.
     */
    private expireDetachedUser(spaceUserId: string): void {
        const detached = this.detachedUsers.get(spaceUserId);
        if (!detached) {
            return;
        }
        this.detachedUsers.delete(spaceUserId);
        clearTimeout(detached.timer);

        const { user, userToNotify } = detached;

        if (userToNotify) {
            this.communicationManager.handleUserToNotifyDeleted(userToNotify).catch((error) => {
                console.error("Error while deleting detached user to notify", error);
                Sentry.captureException(error);
            });
        }

        if (user) {
            if (this.isPublishing(user)) {
                this._nbPublishers--;
            }
            this._nbUsers--;
            this._nbWatchers = this._nbPublishers > 0 ? this._nbUsers : 0;
            this._spaceUpdatedSubject.next(this);

            if (this.filterOneUser(user)) {
                this.communicationManager.handleUserDeleted(user).catch((error) => {
                    console.error("Error while deleting detached user", error);
                    Sentry.captureException(error);
                });
                this.notifyWatchers({
                    message: {
                        $case: "removeSpaceUserMessage",
                        removeSpaceUserMessage: RemoveSpaceUserMessage.fromPartial({
                            spaceName: this.name,
                            spaceUserId,
                        }),
                    },
                });
            }
        }

        this.stopRecordingIfUserCompletelyLeftSpace(spaceUserId).catch((error) => {
            console.error("Error while stopping recording after detached user expired", error);
            Sentry.captureException(error);
        });
        debug(`${this.name} : detached user => expired ${spaceUserId}`);
    }

    public addUserToNotify(sourceWatcher: SpacesWatcher, spaceUser: SpaceUser) {
        const usersList = this.usersListToNotify(sourceWatcher);
        usersList.set(spaceUser.spaceUserId, spaceUser);

        const detached = this.detachedUsers.get(spaceUser.spaceUserId);
        if (detached?.userToNotify) {
            // The communication manager never saw this user leave: nothing to tell it but the reconnection.
            detached.userToNotify = undefined;
            this.settleDetachedUser(spaceUser.spaceUserId, detached);
            return;
        }
        if (this.takeFromOtherWatcher(this.usersToNotify, sourceWatcher, spaceUser.spaceUserId)) {
            return;
        }

        this.communicationManager.handleUserToNotifyAdded(spaceUser).catch((e) => {
            Sentry.captureException(e);
            console.error(e);
        });
        debug(`${this.name} : user to notify => added ${spaceUser.spaceUserId}`);
    }

    public deleteUserToNotify(sourceWatcher: SpacesWatcher, spaceUser: SpaceUser) {
        const usersList = this.usersListToNotify(sourceWatcher);
        usersList.delete(spaceUser.spaceUserId);
        this.communicationManager.handleUserToNotifyDeleted(spaceUser).catch((e) => {
            Sentry.captureException(e);
            console.error(e);
        });
        this.stopRecordingIfUserCompletelyLeftSpace(spaceUser.spaceUserId).catch((error) => {
            console.error("Error while stopping recording after userToNotify removal", error);
            Sentry.captureException(error);
        });
        debug(`${this.name} : user to notify => deleted ${spaceUser.spaceUserId}`);
    }

    public removeUserFromNotify(watcher: SpacesWatcher, spaceUser: SpaceUser) {
        this.usersToNotify.delete(watcher);
    }
    /**
     * Notify all watchers expect the one that sent the message
     */
    private notifyWatchers(message: BackToPusherSpaceMessage) {
        for (const watcher_ of this.users.keys()) {
            watcher_.write(message);
        }
    }

    public canBeDeleted(): boolean {
        debug(`${this.name} : canBeDeleted => size ${this.users.size}`);
        return this.users.size === 0 && this.detachedUsers.size === 0;
    }

    private usersList(watcher: SpacesWatcher): Map<string, SpaceUser> {
        const usersList = this.users.get(watcher);
        if (!usersList) {
            throw new Error("No users list associated to the watcher :" + this.name);
        }
        return usersList;
    }

    private usersListToNotify(watcher: SpacesWatcher): Map<string, SpaceUser> {
        const usersList = this.usersToNotify.get(watcher);
        if (!usersList) {
            throw new Error("No users list associated to the watcher :" + this.name);
        }
        return usersList;
    }

    public customJsonReplacer(key: unknown, value: unknown): string | undefined {
        // TODO : Better way to display date in the /dump
        if (key === "name") {
            return this.name;
        } else if (key === "users") {
            return `Users : ${this.users.size}`;
        }
        return undefined;
    }

    public async dispatchPublicEvent(publicEvent: PublicEvent) {
        if (!publicEvent.spaceEvent?.event) {
            // If there is no event, just forward the public event as-is
            this.notifyWatchers({
                message: {
                    $case: "publicEvent",
                    publicEvent,
                },
            });
            return;
        }

        // Process the event
        const processedEvent = await this.eventProcessor.processPublicEvent(
            publicEvent.spaceEvent.event,
            publicEvent.senderUserId,
            this,
        );

        // Create new public event with processed event
        const processedPublicEvent: PublicEvent = {
            ...publicEvent,
            spaceEvent: {
                event: processedEvent,
            },
        };
        this.notifyWatchers({
            message: {
                $case: "publicEvent",
                publicEvent: processedPublicEvent,
            },
        });
    }

    public dispatchPrivateEvent(privateEvent: PrivateEvent) {
        const sender = this.getAllUsers().find((user) => user.spaceUserId === privateEvent.senderUserId);
        if (!sender) {
            // If the sender is the receiver, it means the message is sent from the server itself.
            // This is a special case, where (if the receiver is gone), we don't want to throw an error.
            if (privateEvent.senderUserId === privateEvent.receiverUserId) {
                return;
            }
            throw new Error(`Sender ${privateEvent.senderUserId} not found in space ${this.name}`);
        }

        // Let's notify the watcher that contains the user
        if (!privateEvent.spaceEvent?.event) {
            // If there is no event, just forward the private event as-is
            for (const [watcher, users] of this.users.entries()) {
                if (users.has(privateEvent.receiverUserId)) {
                    watcher.write({
                        message: {
                            $case: "privateEvent",
                            privateEvent: {
                                spaceName: privateEvent.spaceName,
                                receiverUserId: privateEvent.receiverUserId,
                                spaceEvent: privateEvent.spaceEvent,
                                sender,
                            },
                        },
                    });
                }
            }
            return;
        }

        // Process the event
        const processedEvent = this.eventProcessor.processPrivateEvent(
            privateEvent.spaceEvent.event,
            privateEvent.senderUserId,
            privateEvent.receiverUserId,
        );

        // Create new private event with processed event
        const processedPrivateEvent: PrivateEvent = {
            ...privateEvent,
            spaceEvent: {
                event: processedEvent,
            },
        };

        // Send to target user
        for (const [watcher, users] of this.users.entries()) {
            if (users.has(privateEvent.receiverUserId)) {
                watcher.write({
                    message: {
                        $case: "privateEvent",
                        privateEvent: {
                            ...processedPrivateEvent,
                            sender,
                        },
                    },
                });
            }
        }
    }

    public handleBackEvent(backEvent: BackEventMessage) {
        const event = backEvent.backEvent?.event;
        if (!event) {
            throw new Error("Back event has no event");
        }

        switch (event.$case) {
            case "meetingConnectionRestartMessage": {
                this.communicationManager.handleMeetingConnectionRestartMessage(
                    event.meetingConnectionRestartMessage,
                    backEvent.senderUserId,
                );
                break;
            }
            default: {
                const _exhaustiveCheck: never = event as never;
            }
        }
    }

    public syncUsersFromPusher(watcher: SpacesWatcher, users: SpaceUser[]) {
        this.users.set(watcher, new Map<string, SpaceUser>(users.map((user) => [user.spaceUserId, user])));
    }

    public async handleQuery(
        watcher: SpacesWatcher,
        spaceQueryMessage: SpaceQueryMessage,
    ): Promise<Pick<SpaceAnswerMessage, "answer">> {
        try {
            if (!spaceQueryMessage.query) {
                throw new Error("SpaceQueryMessage has no query");
            }

            const queryCase = spaceQueryMessage.query.$case;

            switch (queryCase) {
                case "addSpaceUserQuery": {
                    if (!spaceQueryMessage.query.addSpaceUserQuery.user) {
                        throw new Error("SpaceQueryMessage has no user");
                    }

                    if (this.filterType !== spaceQueryMessage.query.addSpaceUserQuery.filterType) {
                        throw new Error("Filter type mismatch when adding user to space");
                    }

                    this.addUser(watcher, spaceQueryMessage.query.addSpaceUserQuery.user);
                    this._spaceUpdatedSubject.next(this);
                    return {
                        answer: {
                            $case: "addSpaceUserAnswer",
                            addSpaceUserAnswer: {
                                spaceName: this.name,
                                spaceUserId: spaceQueryMessage.query.addSpaceUserQuery.user.spaceUserId,
                            },
                        },
                    };
                }
                case "removeSpaceUserQuery": {
                    this.removeUser(watcher, spaceQueryMessage.query.removeSpaceUserQuery.spaceUserId);
                    return {
                        answer: {
                            $case: "removeSpaceUserAnswer",
                            removeSpaceUserAnswer: {
                                spaceName: this.name,
                                spaceUserId: spaceQueryMessage.query.removeSpaceUserQuery.spaceUserId,
                            },
                        },
                    };
                }
                case "startSpaceRecordingQuery": {
                    const { spaceUserId } = spaceQueryMessage.query.startSpaceRecordingQuery;
                    const user = this.getUser(spaceUserId);

                    if (!user) {
                        throw new Error(`Could not find user ${spaceUserId} in space ${this.name}`);
                    }

                    await this.startRecording(user);
                    return {
                        answer: {
                            $case: "startSpaceRecordingAnswer",
                            startSpaceRecordingAnswer: {},
                        },
                    };
                }
                case "stopSpaceRecordingQuery": {
                    const { spaceUserId } = spaceQueryMessage.query.stopSpaceRecordingQuery;
                    const user = this.getUser(spaceUserId);

                    if (!user) {
                        throw new Error(`Could not find user ${spaceUserId} in space ${this.name}`);
                    }

                    await this.stopRecording(user);
                    return {
                        answer: {
                            $case: "stopSpaceRecordingAnswer",
                            stopSpaceRecordingAnswer: {},
                        },
                    };
                }

                default: {
                    const _exhaustiveCheck: never = queryCase;
                    throw new Error("Unknown query");
                }
            }
        } catch (e) {
            const error = asError(e);
            console.error("Error while handling query", error);
            Sentry.captureException(error);
            return {
                answer: {
                    $case: "error",
                    error: {
                        message: `Error while handling query : ${error.message}}`,
                    },
                },
            };
        }
    }

    public get filterType(): Filter {
        return this._filterType;
    }

    /*
     * This function is used to shutdown the pusher connection of the space. for testing purpose.
     */
    public closeAllWatcherConnections() {
        for (const watcher of this.users.keys()) {
            watcher.error("Space closed by back");
            watcher.end();
            this.users.delete(watcher);
        }
    }
    public getAllUsers(): SpaceUser[] {
        return Array.from(this.users.values()).flatMap((users) => Array.from(users.values()));
    }
    public getUsersInFilter(): SpaceUser[] {
        return this.getAllUsers().filter((user) => this.filterOneUser(user));
    }

    public getUsersToNotify(): SpaceUser[] {
        return Array.from(this.usersToNotify.values()).flatMap((users) => Array.from(users.values()));
    }

    public getUser(spaceUserId: string): SpaceUser | undefined {
        return Array.from(this.users.values())
            .flatMap((users: Map<string, SpaceUser>) => Array.from(users.values()))
            .find((user: SpaceUser) => user.spaceUserId === spaceUserId);
    }

    public getMetadataValue(key: string): unknown {
        return this.metadata.get(key);
    }

    public getSpaceName(): string {
        return this.name;
    }
    public getPropertiesToSync(): string[] {
        return this._propertiesToSync;
    }

    private get isBroadcast(): boolean {
        return this._filterType !== FilterType.ALL_USERS;
    }

    private isPublishing(spaceUser: SpaceUser): boolean {
        if (this.filterType === FilterType.ALL_USERS) {
            return spaceUser.cameraState || spaceUser.microphoneState || spaceUser.screenSharingState;
        }
        if (this.filterType === FilterType.LIVE_STREAMING_USERS) {
            return (
                spaceUser.megaphoneState &&
                (spaceUser.cameraState || spaceUser.microphoneState || spaceUser.screenSharingState)
            );
        }
        if (this.filterType === FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK) {
            // Speakers (megaphoneState) are publishing
            return spaceUser.cameraState || spaceUser.microphoneState || spaceUser.megaphoneState;
        }
        return false;
    }

    get nbWatchers(): number {
        return this._nbWatchers;
    }
    get nbUsers(): number {
        return this._nbUsers;
    }
    get nbPublishers(): number {
        return this._nbPublishers;
    }

    public async startRecording(user: SpaceUser) {
        try {
            await this.communicationManager.handleStartRecording(user);
        } catch (error) {
            Sentry.captureException(error);
            throw error; // Re-throw the error to be handled by the caller
        }
    }
    public async stopRecording(user: SpaceUser) {
        await this.communicationManager.handleStopRecording(user);
    }
    public async stopRecordingByServer(): Promise<void> {
        await this.communicationManager.handleServerStopRecording();
    }
    public async handleLivekitWebhook(request: HandleLivekitWebhookRequest): Promise<void> {
        await this.communicationManager.handleLivekitWebhook(request);
    }
    public getRecordingState(): ManagedRecordingState {
        return this.communicationManager.getRecordingState();
    }
    /**
     * Closes an open session early, for a shutdown that is about to take the process —
     * and with it every session, which only exists once it has ended. Says whether there
     * was one, which is what the caller counts.
     */
    public closeSession(endReason: SessionEndReason): boolean {
        return this.communicationManager.closeSession(endReason);
    }

    public destroy() {
        for (const { timer } of this.detachedUsers.values()) {
            clearTimeout(timer);
        }
        this.detachedUsers.clear();
        // The manager closes the session it owns.
        this.communicationManager.destroy();
        debug(`${this.name} => destroyed`);
    }

    public publishMetadata(metadata: { [key: string]: unknown }): void {
        if (Object.keys(metadata).length === 0) {
            return;
        }

        for (const [key, value] of Object.entries(metadata)) {
            this.metadata.set(key, value);
        }
        if ("spaceKind" in metadata) {
            this.communicationManager.handleSpaceKindChanged();
        }

        this.notifyWatchers({
            message: {
                $case: "updateSpaceMetadataMessage",
                updateSpaceMetadataMessage: UpdateSpaceMetadataMessage.fromPartial({
                    spaceName: this.name,
                    metadata: JSON.stringify(metadata),
                }),
            },
        });

        debug(`${this.name} : metadata => updated`);
    }

    private async stopRecordingIfUserCompletelyLeftSpace(spaceUserId: string): Promise<void> {
        if (this.isUserStillPresentInSpace(spaceUserId)) {
            return;
        }

        const didStop = await this.communicationManager.handleRecorderLeftSpace(spaceUserId);
        if (!didStop) {
            return;
        }
    }

    private isUserStillPresentInSpace(spaceUserId: string): boolean {
        for (const usersList of this.users.values()) {
            if (usersList.has(spaceUserId)) {
                return true;
            }
        }

        for (const usersToNotifyList of this.usersToNotify.values()) {
            if (usersToNotifyList.has(spaceUserId)) {
                return true;
            }
        }

        return false;
    }
}
