import { applyFieldMask } from "protobuf-fieldmask";
import { merge } from "lodash";
import * as Sentry from "@sentry/node";
import type {
    BackToPusherSpaceMessage,
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
import type { CustomJsonReplacerInterface } from "./CustomJsonReplacerInterface";
import type { SpacesWatcher } from "./SpacesWatcher";
import type { EventProcessor } from "./EventProcessor";
import { CommunicationManager } from "./CommunicationManager";
import type { ICommunicationManager } from "./Interfaces/ICommunicationManager";
import type { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";

const debug = Debug("space");

type Filter = Exclude<FilterType, FilterType.UNRECOGNIZED>;

export class Space implements CustomJsonReplacerInterface, ICommunicationSpace {
    readonly name: string;
    private users: Map<SpacesWatcher, Map<string, SpaceUser>>;
    private metadata: Map<string, unknown>;
    private communicationManager: ICommunicationManager;
    private usersToNotify: Map<SpacesWatcher, Map<string, SpaceUser>>;
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
        private _spaceUpdatedSubject = clientEventsEmitter.spaceUpdatedSubject
    ) {
        this.name = name;
        this.users = new Map<SpacesWatcher, Map<SpaceUser["spaceUserId"], SpaceUser>>();
        //equivalent of watchers in the pusher
        this.usersToNotify = new Map<SpacesWatcher, Map<SpaceUser["spaceUserId"], SpaceUser>>();
        this.metadata = new Map<string, unknown>();
        this.communicationManager = new CommunicationManager(this);
        debug(`${name} => created`);
    }

    public addUser(sourceWatcher: SpacesWatcher, spaceUser: SpaceUser) {
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
            merge(user, updateValues);

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
                    `${this.name} : user updated => removed ${user.spaceUserId} updateMask : ${updateMask.join(", ")}`
                );

                this.communicationManager.handleUserDeleted(user).catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
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
                        ", "
                    )} in space ${this.name}`
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

                this.communicationManager.handleUserUpdated(user).catch((e) => {
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

    public removeUser(sourceWatcher: SpacesWatcher, spaceUserId: string) {
        let user: SpaceUser | undefined;
        try {
            const usersList = this.usersList(sourceWatcher);
            user = usersList.get(spaceUserId);

            const usersToNotifyList = this.usersListToNotify(sourceWatcher);
            usersToNotifyList.delete(spaceUserId);

            if (!user) {
                console.error("User not found in this space", spaceUserId);
                return;
            }

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

            /*if (usersList.size === 0) {
                debug(`${this.name} : users list => deleted ${sourceWatcher.id}`);
                this.users.delete(sourceWatcher);
            }*/

            // this.communicationManager.handleUserDeleted(user);
        } catch (e) {
            console.error("Error while removing user", e);
            Sentry.captureException(e);
            debug("Error while removing user", e);
        } finally {
            if (user && this.filterOneUser(user)) {
                this.communicationManager.handleUserDeleted(user).catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
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
        }
    }

    public updateMetadata(watcher: SpacesWatcher, metadata: { [key: string]: unknown }) {
        for (const key in metadata) {
            this.metadata.set(key, metadata[key]);
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

    private filterOneUser(user: SpaceUser): boolean {
        switch (this._filterType) {
            case FilterType.ALL_USERS: {
                return true;
            }
            case FilterType.LIVE_STREAMING_USERS: {
                return /*(user.screenSharingState || user.microphoneState || user.cameraState) &&*/ user.megaphoneState;
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

        watcher.write({
            message: {
                $case: "initSpaceUsersMessage",
                initSpaceUsersMessage: {
                    spaceName: this.name,
                    users: allSpaceUsers,
                },
            },
        });

        const metadata: { [key: string]: unknown } = {};

        for (const key of this.metadata.keys()) {
            metadata[key] = this.metadata.get(key);
        }

        watcher.write({
            message: {
                $case: "updateSpaceMetadataMessage",
                updateSpaceMetadataMessage: UpdateSpaceMetadataMessage.fromPartial({
                    spaceName: this.name,
                    metadata: JSON.stringify(metadata),
                }),
            },
        });
    }

    public removeWatcher(watcher: SpacesWatcher) {
        const spaceUsers = this.users.get(watcher);
        if (spaceUsers) {
            for (const spaceUser of spaceUsers.values()) {
                this.communicationManager.handleUserDeleted(spaceUser).catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
                });
            }
        }
        this.users.delete(watcher);

        const spaceUsersToNotify = this.usersToNotify.get(watcher);
        if (spaceUsersToNotify) {
            for (const spaceUser of spaceUsersToNotify.values()) {
                this.communicationManager.handleUserToNotifyDeleted(spaceUser).catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
                });
            }
        }
        this.usersToNotify.delete(watcher);
        // In case was not empty when it was removed, we need to notify the other watchers
        for (const spaceUser of spaceUsers?.values() || []) {
            if (!this.filterOneUser(spaceUser)) {
                continue;
            }

            debug(
                `${this.name} => removing space user ${spaceUser.spaceUserId} from watcher ${watcher.id} before removing watcher`
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

        debug(`${this.name} => watcher removed ${watcher.id}`);
    }

    public addUserToNotify(sourceWatcher: SpacesWatcher, spaceUser: SpaceUser) {
        const usersList = this.usersListToNotify(sourceWatcher);
        usersList.set(spaceUser.spaceUserId, spaceUser);

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
        return this.users.size === 0;
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

    public dispatchPublicEvent(publicEvent: PublicEvent) {
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
        const processedEvent = this.eventProcessor.processPublicEvent(
            publicEvent.spaceEvent.event,
            publicEvent.senderUserId,
            this.getAllUsers()
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
            privateEvent.receiverUserId
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

    public syncUsersFromPusher(watcher: SpacesWatcher, users: SpaceUser[]) {
        this.users.set(watcher, new Map<string, SpaceUser>(users.map((user) => [user.spaceUserId, user])));
    }

    public handleQuery(
        watcher: SpacesWatcher,
        spaceQueryMessage: SpaceQueryMessage
    ): Pick<SpaceAnswerMessage, "answer"> {
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

    public getSpaceName(): string {
        return this.name;
    }
    public getPropertiesToSync(): string[] {
        return this._propertiesToSync;
    }

    private isPublishing(spaceUser: SpaceUser): boolean {
        return (
            (this.filterType === FilterType.ALL_USERS &&
                (spaceUser.cameraState || spaceUser.microphoneState || spaceUser.screenSharingState)) ||
            (this.filterType === FilterType.LIVE_STREAMING_USERS &&
                spaceUser.megaphoneState &&
                (spaceUser.cameraState || spaceUser.microphoneState || spaceUser.screenSharingState))
        );
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
}
