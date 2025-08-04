import { applyFieldMask } from "protobuf-fieldmask";
import { merge, isEqual } from "lodash";
import * as Sentry from "@sentry/node";
import {
    AddSpaceUserMessage,
    BackToPusherSpaceMessage,
    FilterType,
    PrivateEvent,
    PublicEvent,
    RemoveSpaceUserMessage,
    SpaceAnswerMessage,
    SpaceQueryMessage,
    SpaceUser,
    UpdateSpaceMetadataMessage,
} from "@workadventure/messages";
import Debug from "debug";
import { asError } from "catch-unknown";
import { clientEventsEmitter } from "../Services/ClientEventsEmitter";
import { CustomJsonReplacerInterface } from "./CustomJsonReplacerInterface";
import { SpacesWatcher } from "./SpacesWatcher";
import { EventProcessor } from "./EventProcessor";
import { CommunicationManager } from "./CommunicationManager";
import { ICommunicationManager } from "./Interfaces/ICommunicationManager";

const debug = Debug("space");

type Filter = Exclude<FilterType, FilterType.UNRECOGNIZED>;

export class Space implements CustomJsonReplacerInterface {
    readonly name: string;
    private users: Map<SpacesWatcher, Map<string, SpaceUser>>;
    private metadata: Map<string, unknown>;
    private communicationManager: ICommunicationManager;
    private usersToNotify: Map<SpacesWatcher, Map<string, SpaceUser>>;

    constructor(
        name: string,
        private _filterType: Filter,
        private eventProcessor: EventProcessor,
        private _propertiesToSync: string[],
        private _clientEventsEmitter = clientEventsEmitter
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
            this._clientEventsEmitter.emitSpaceJoin(this.name);

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

            this.communicationManager.handleUserAdded(spaceUser);
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
                Sentry.captureMessage(`User not found in this space ${spaceUser.spaceUserId}`);
                return;
            }

            const oldFilter = this.filterOneUser(user);

            const updateValues = applyFieldMask(spaceUser, updateMask);
            merge(user, updateValues);

            const newFilter = this.filterOneUser(user);

            usersList.set(spaceUser.spaceUserId, user);

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
                //TODO : voir si on peut séparer la logique qui watch et qui peut etre watch / pour l'instant on a un probleme les videos ne sont envoyées que a tout les personnes qu'on peut watcher pas aux autres

                this.communicationManager.handleUserAdded(user);
            } else if (oldFilter && !newFilter) {
                debug(
                    `${this.name} : user updated => removed ${user.spaceUserId} updateMask : ${updateMask.join(", ")}`
                );
                this.notifyWatchers({
                    message: {
                        $case: "removeSpaceUserMessage",
                        removeSpaceUserMessage: RemoveSpaceUserMessage.fromPartial({
                            spaceName: this.name,
                            spaceUserId: user.spaceUserId,
                        }),
                    },
                });

                this.communicationManager.handleUserDeleted(user);
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

                this.communicationManager.handleUserUpdated(spaceUser);
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
                Sentry.captureMessage(`User not found in this space ${spaceUserId}`);
                return;
            }

            usersList.delete(spaceUserId);
            this._clientEventsEmitter.emitSpaceLeave(this.name);
            debug(`${this.name} : user => removed ${spaceUserId}`);

            if (usersList.size === 0) {
                debug(`${this.name} : users list => deleted ${sourceWatcher.id}`);
                this.users.delete(sourceWatcher);
            }

            // this.communicationManager.handleUserDeleted(user);
        } catch (e) {
            console.error("Error while removing user", e);
            Sentry.captureException(e);
            debug("Error while removing user", e);
        } finally {
            if (user && this.filterOneUser(user)) {
                this.notifyWatchers({
                    message: {
                        $case: "removeSpaceUserMessage",
                        removeSpaceUserMessage: RemoveSpaceUserMessage.fromPartial({
                            spaceName: this.name,
                            spaceUserId: spaceUserId,
                        }),
                    },
                });
                this.communicationManager.handleUserDeleted(user);
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
        for (const spaceUsers of this.users.values()) {
            for (const spaceUser of spaceUsers.values()) {
                if (!this.filterOneUser(spaceUser)) {
                    continue;
                }

                watcher.write({
                    message: {
                        $case: "addSpaceUserMessage",
                        addSpaceUserMessage: AddSpaceUserMessage.fromPartial({
                            spaceName: this.name,
                            user: spaceUser,
                            filterType: this._filterType,
                        }),
                    },
                });
            }
        }

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
        this.users.delete(watcher);
        const spaceUsersToNotify = this.usersToNotify.get(watcher);

        if (spaceUsersToNotify) {
            for (const spaceUser of spaceUsersToNotify.values()) {
                this.communicationManager.handleUserToNotifyDeleted(spaceUser);
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

        this.communicationManager.handleUserToNotifyAdded(spaceUser);
        debug(`${this.name} : user to notify => added ${spaceUser.spaceUserId}`);
    }

    public deleteUserToNotify(sourceWatcher: SpacesWatcher, spaceUser: SpaceUser) {
        const usersList = this.usersListToNotify(sourceWatcher);
        usersList.delete(spaceUser.spaceUserId);
        this.communicationManager.handleUserToNotifyDeleted(spaceUser);
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
            publicEvent.senderUserId
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

        if (privateEvent.spaceEvent.event.$case === "userReadyForSwitchEvent") {
            this.communicationManager.handleUserReadyForSwitch(privateEvent.senderUserId);
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
                    this._clientEventsEmitter.emitSpaceJoin(this.name);
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
                    this._clientEventsEmitter.emitSpaceLeave(this.name);
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

    /**
     * Synchronizes the provided user list with the local user list and returns diff events
     * This is useful for resynchronization after network issues or throttling
     *
     * @param watcher The watcher requesting the sync
     * @param providedUsers The user list from the client
     * @returns Array of events representing the differences
     */
    public syncAndDiff(watcher: SpacesWatcher, providedUsers: SpaceUser[]): BackToPusherSpaceMessage[] {
        const events: BackToPusherSpaceMessage[] = [];
        const localUsers = this.usersList(watcher);

        // Convert provided users to a Map for easier comparison
        const providedUsersMap = new Map(providedUsers.map((user) => [user.spaceUserId, user]));

        debug(
            `${this.name} : syncAndDiff => comparing ${providedUsers.length} provided users with ${localUsers.size} local users`
        );

        // 1. Check for users that exist locally but not in provided list (client missing users)
        for (const [localUserId, localUser] of localUsers.entries()) {
            if (!providedUsersMap.has(localUserId)) {
                // User exists locally but client doesn't have it -> ADD event
                if (this.filterOneUser(localUser)) {
                    events.push({
                        message: {
                            $case: "addSpaceUserMessage",
                            addSpaceUserMessage: AddSpaceUserMessage.fromPartial({
                                spaceName: this.name,
                                user: localUser,
                                filterType: this._filterType,
                            }),
                        },
                    });
                    debug(`${this.name} : syncAndDiff => client missing user ${localUserId}, sending ADD`);
                }
            }
        }

        // 2. Check for users in provided list
        for (const [providedUserId, providedUser] of providedUsersMap.entries()) {
            const localUser = localUsers.get(providedUserId);

            if (!localUser) {
                // User exists in client but not locally -> REMOVE event
                if (this.filterOneUser(providedUser)) {
                    events.push({
                        message: {
                            $case: "removeSpaceUserMessage",
                            removeSpaceUserMessage: RemoveSpaceUserMessage.fromPartial({
                                spaceName: this.name,
                                spaceUserId: providedUserId,
                            }),
                        },
                    });
                    debug(`${this.name} : syncAndDiff => client has extra user ${providedUserId}, sending REMOVE`);
                }
            } else {
                // User exists in both, check for differences
                const differences = this.getUserDifferences(localUser, providedUser);

                if (differences.length > 0) {
                    const oldFilter = this.filterOneUser(providedUser);
                    const newFilter = this.filterOneUser(localUser);

                    if (!oldFilter && newFilter) {
                        // User now passes filter -> ADD event
                        events.push({
                            message: {
                                $case: "addSpaceUserMessage",
                                addSpaceUserMessage: AddSpaceUserMessage.fromPartial({
                                    spaceName: this.name,
                                    user: localUser,
                                    filterType: this._filterType,
                                }),
                            },
                        });
                        debug(`${this.name} : syncAndDiff => user ${providedUserId} now visible, sending ADD`);
                    } else if (oldFilter && !newFilter) {
                        // User no longer passes filter -> REMOVE event
                        events.push({
                            message: {
                                $case: "removeSpaceUserMessage",
                                removeSpaceUserMessage: RemoveSpaceUserMessage.fromPartial({
                                    spaceName: this.name,
                                    spaceUserId: providedUserId,
                                }),
                            },
                        });
                        debug(`${this.name} : syncAndDiff => user ${providedUserId} no longer visible, sending REMOVE`);
                    } else if (oldFilter && newFilter) {
                        // User still passes filter but has changes -> UPDATE event
                        events.push({
                            message: {
                                $case: "updateSpaceUserMessage",
                                updateSpaceUserMessage: {
                                    spaceName: this.name,
                                    user: localUser,
                                    updateMask: differences,
                                },
                            },
                        });
                        debug(
                            `${
                                this.name
                            } : syncAndDiff => user ${providedUserId} updated, sending UPDATE with mask: ${differences.join(
                                ", "
                            )}`
                        );
                    }
                }
            }
        }

        debug(`${this.name} : syncAndDiff => generated ${events.length} diff events`);
        return events;
    }

    /**
     * Synchronizes the provided user list with the local user list and returns diff events as PrivateEvents
     * This is useful for resynchronization after network issues or throttling
     *
     * @param watcher The watcher requesting the sync
     * @param providedUsers The user list from the client
     * @param senderUserId The user requesting the synchronization
     * @returns Array of PrivateEvents representing the differences
     */
    public syncAndDiffAsPrivateEvents(
        watcher: SpacesWatcher,
        providedUsers: SpaceUser[],
        senderUserId: string
    ): BackToPusherSpaceMessage[] {
        const backEvents: BackToPusherSpaceMessage[] = [];
        const localUsers = this.usersList(watcher);

        const providedUsersMap = new Map(providedUsers.map((user) => [user.spaceUserId, user]));
        const sender = this.getAllUsers().find((user) => user.spaceUserId === senderUserId);
        if (!sender) {
            throw new Error(`Sender ${senderUserId} not found in space ${this.name}`);
        }

        debug(
            `${this.name} : syncAndDiffAsPrivateEvents => comparing ${providedUsers.length} provided users with ${localUsers.size} local users`
        );

        for (const [localUserId, localUser] of localUsers.entries()) {
            // Skip the sender user - they don't need to be synced to themselves
            if (localUserId === senderUserId) {
                continue;
            }

            if (!providedUsersMap.has(localUserId)) {
                if (this.filterOneUser(localUser)) {
                    backEvents.push({
                        message: {
                            $case: "privateEvent",
                            privateEvent: {
                                spaceName: this.name,
                                receiverUserId: senderUserId,
                                sender,
                                spaceEvent: {
                                    event: {
                                        $case: "addSpaceUserMessage",
                                        addSpaceUserMessage: AddSpaceUserMessage.fromPartial({
                                            spaceName: this.name,
                                            user: localUser,
                                            filterType: this._filterType,
                                        }),
                                    },
                                },
                            },
                        },
                    });
                    debug(
                        `${this.name} : syncAndDiffAsPrivateEvents => client missing user ${localUserId}, sending ADD as PrivateEvent`
                    );
                }
            }
        }

        for (const [providedUserId, providedUser] of providedUsersMap.entries()) {
            // Skip the sender user - they don't need to be synced to themselves
            if (providedUserId === senderUserId) {
                continue;
            }

            const localUser = localUsers.get(providedUserId);

            if (!localUser) {
                if (this.filterOneUser(providedUser)) {
                    backEvents.push({
                        message: {
                            $case: "privateEvent",
                            privateEvent: {
                                spaceName: this.name,
                                receiverUserId: senderUserId,
                                sender,
                                spaceEvent: {
                                    event: {
                                        $case: "removeSpaceUserMessage",
                                        removeSpaceUserMessage: RemoveSpaceUserMessage.fromPartial({
                                            spaceName: this.name,
                                            spaceUserId: providedUserId,
                                        }),
                                    },
                                },
                            },
                        },
                    });
                    debug(
                        `${this.name} : syncAndDiffAsPrivateEvents => client has extra user ${providedUserId}, sending REMOVE as PrivateEvent`
                    );
                }
            } else {
                const differences = this.getUserDifferences(localUser, providedUser);

                if (differences.length > 0) {
                    const oldFilter = this.filterOneUser(providedUser);
                    const newFilter = this.filterOneUser(localUser);

                    if (!oldFilter && newFilter) {
                        backEvents.push(
                            this.createPrivateEvent(sender, {
                                event: {
                                    $case: "addSpaceUserMessage",
                                    addSpaceUserMessage: AddSpaceUserMessage.fromPartial({
                                        spaceName: this.name,
                                        user: localUser,
                                        filterType: this._filterType,
                                    }),
                                },
                            })
                        );
                        debug(
                            `${this.name} : syncAndDiffAsPrivateEvents => user ${providedUserId} now visible, sending ADD as PrivateEvent`
                        );
                    } else if (oldFilter && !newFilter) {
                        backEvents.push(
                            this.createPrivateEvent(sender, {
                                event: {
                                    $case: "removeSpaceUserMessage",
                                    removeSpaceUserMessage: RemoveSpaceUserMessage.fromPartial({
                                        spaceName: this.name,
                                        spaceUserId: providedUserId,
                                    }),
                                },
                            })
                        );
                        debug(
                            `${this.name} : syncAndDiffAsPrivateEvents => user ${providedUserId} no longer visible, sending REMOVE as PrivateEvent`
                        );
                    } else if (oldFilter && newFilter) {
                        backEvents.push(
                            this.createPrivateEvent(sender, {
                                event: {
                                    $case: "updateSpaceUserMessage",
                                    updateSpaceUserMessage: {
                                        spaceName: this.name,
                                        user: localUser,
                                        updateMask: differences,
                                    },
                                },
                            })
                        );
                        debug(
                            `${
                                this.name
                            } : syncAndDiffAsPrivateEvents => user ${providedUserId} updated, sending UPDATE as PrivateEvent with mask: ${differences.join(
                                ", "
                            )}`
                        );
                    }
                }
            }
        }

        debug(`${this.name} : syncAndDiffAsPrivateEvents => generated ${backEvents.length} PrivateEvent messages`);
        return backEvents;
    }

    /**
     * Configuration of SpaceUser fields for comparison
     */
    private static readonly USER_COMPARISON_FIELDS = [
        "spaceUserId",
        "name",
        "microphoneState",
        "cameraState",
        "screenSharingState",
        "megaphoneState",
        "chatID",
        "availabilityStatus",
        "visitCardUrl",
        "characterTextures",
    ] as const;

    private getUserDifferences(localUser: SpaceUser, providedUser: SpaceUser): string[] {
        const differences: string[] = [];

        for (const field of Space.USER_COMPARISON_FIELDS) {
            if (!isEqual(localUser[field], providedUser[field])) {
                differences.push(field);
            }
        }

        return differences;
    }

    public sendDiffEvents(watcher: SpacesWatcher, events: BackToPusherSpaceMessage[]): void {
        events.forEach((event) => {
            watcher.write(event);
        });

        debug(`${this.name} : sendDiffEvents => sent ${events.length} events to watcher ${watcher.id}`);
    }

    public syncUsersAndNotify(watcher: SpacesWatcher, providedUsers: SpaceUser[], senderUserId: string) {
        const diffEvents = this.syncAndDiffAsPrivateEvents(watcher, providedUsers, senderUserId);
        this.sendDiffEvents(watcher, diffEvents);
        debug(
            `${this.name} : syncUsersAndNotify => processed sync for watcher ${watcher.id}, sent ${diffEvents.length} PrivateEvents`
        );
    }

    private createPrivateEvent(sender: SpaceUser, spaceEvent: PrivateEvent["spaceEvent"]): BackToPusherSpaceMessage {
        return {
            message: {
                $case: "privateEvent",
                privateEvent: {
                    spaceName: this.name,
                    receiverUserId: sender.spaceUserId,
                    sender,
                    spaceEvent,
                },
            },
        };
    }
}
