import {
    AddSpaceFilterMessage,
    NonUndefinedFields,
    noUndefined,
    PrivateEvent,
    PublicEvent,
    PusherToBackSpaceMessage,
    RemoveSpaceFilterMessage,
    SpaceFilterMessage,
    SpaceUser,
    SubMessage,
    UpdateSpaceFilterMessage,
} from "@workadventure/messages";
import { applyFieldMask } from "protobuf-fieldmask";
import merge from "lodash/merge";
import Debug from "debug";
import * as Sentry from "@sentry/node";
import { Socket } from "../services/SocketManager";
import { BackSpaceConnection } from "./Websocket/SocketData";
import { EventProcessor } from "./EventProcessor";

export type SpaceUserExtended = {
    lowercaseName: string;
    // If the user is connected to this pusher, we store the socket to be able to contact the user directly.
    // Useful to forward public and private event that are dispatched even if the space is not watched.
    client: Socket | undefined;
} & SpaceUser;

type PartialSpaceUser = Partial<Omit<SpaceUser, "spaceUserId">> & Pick<SpaceUser, "spaceUserId">;

const debug = Debug("space");

export class Space {
    // The list of all users connected to this space (that we received either by a direct connection OR from the back) indexed by spaceUserId
    private readonly users: Map<string, SpaceUserExtended>;
    private readonly _metadata: Map<string, unknown>;

    // The list of users connected to THIS pusher specifically
    private clientWatchers: Map<string, Socket>;

    constructor(
        public readonly name: string,
        // The local name is the name of the space in the browser (i.e. the name without the "world" prefix)
        private readonly localName: string,
        private spaceStreamToPusher: BackSpaceConnection,
        public backId: number,
        private eventProcessor: EventProcessor
    ) {
        this.users = new Map<string, SpaceUserExtended>();
        this._metadata = new Map<string, unknown>();
        this.clientWatchers = new Map<string, Socket>();
        debug(`created : ${name}`);
    }

    private addClientWatcher(watcher: Socket) {
        const socketData = watcher.getUserData();
        if (!socketData.spaceUser.spaceUserId) {
            throw new Error("Space user id not found");
        }
        if (this.clientWatchers.has(socketData.spaceUser.spaceUserId)) {
            throw new Error("Watcher already added for user " + socketData.spaceUser.spaceUserId);
        }
        this.clientWatchers.set(socketData.spaceUser.spaceUserId, watcher);
        this.users.forEach((user) => {
            if (this.isWatcherTargeted(watcher, user)) {
                const filterOfThisSpace = socketData.spacesFilters.get(this.name) ?? [];
                const filtersTargeted = filterOfThisSpace.filter((spaceFilter) =>
                    this.filterOneUser(spaceFilter, user)
                );

                filtersTargeted.forEach((spaceFilter) => {
                    this.notifyMeAddUser(watcher, user, spaceFilter.filterName);
                });
            }
        });
        debug(`${this.name} : watcher added ${socketData.name}. Watcher count ${this.clientWatchers.size}`);
    }

    public addUser(spaceUser: SpaceUser, client: Socket) {
        this.addClientWatcher(client);

        const pusherToBackSpaceMessage: PusherToBackSpaceMessage = {
            message: {
                $case: "addSpaceUserMessage",
                addSpaceUserMessage: {
                    spaceName: this.name,
                    user: spaceUser,
                },
            },
        };
        this.spaceStreamToPusher.write(pusherToBackSpaceMessage);
        debug(`${this.name} : user add sent ${spaceUser.spaceUserId}`);
        this.localAddUser(spaceUser, client);
    }

    public localAddUser(spaceUser: SpaceUser, client: Socket | undefined) {
        const user: Partial<SpaceUserExtended> = spaceUser;
        user.lowercaseName = spaceUser.name.toLowerCase();
        user.client = client;

        if (this.users.has(spaceUser.spaceUserId)) {
            throw new Error(`User ${spaceUser.spaceUserId} already exists in space ${this.name}`);
        }
        this.users.set(spaceUser.spaceUserId, user as SpaceUserExtended);
        debug(`${this.name} : user added ${spaceUser.spaceUserId}. User count ${this.users.size}`);
        const subMessage: SubMessage = {
            message: {
                $case: "addSpaceUserMessage",
                addSpaceUserMessage: {
                    spaceName: this.localName,
                    user: spaceUser,
                    filterName: "", // Will be filled by notifyAll
                },
            },
        };
        this.notifyAll(subMessage, user as SpaceUserExtended);
    }

    public updateUser(spaceUser: PartialSpaceUser, updateMask: string[]) {
        const pusherToBackSpaceMessage: PusherToBackSpaceMessage = {
            message: {
                $case: "updateSpaceUserMessage",
                updateSpaceUserMessage: {
                    spaceName: this.name,
                    user: SpaceUser.fromPartial(spaceUser),
                    updateMask,
                },
            },
        };
        this.spaceStreamToPusher.write(pusherToBackSpaceMessage);
        this.localUpdateUser(spaceUser, updateMask);
    }
    public localUpdateUser(spaceUser: PartialSpaceUser, updateMask: string[]) {
        const user = this.users.get(spaceUser.spaceUserId);
        if (!user) {
            console.error("User not found in this space", spaceUser);
            Sentry.captureException(new Error(`User not found in this space ${spaceUser.spaceUserId}`));
            return;
        }
        const oldUser: SpaceUserExtended | undefined = { ...user };
        const updateValues = applyFieldMask(spaceUser, updateMask);

        merge(user, updateValues);

        if (spaceUser.name) user.lowercaseName = spaceUser.name.toLowerCase();
        debug(`${this.name} : user updated ${spaceUser.spaceUserId}`);
        const subMessage: SubMessage = {
            message: {
                $case: "updateSpaceUserMessage",
                updateSpaceUserMessage: {
                    spaceName: this.name,
                    user: SpaceUser.fromPartial(spaceUser),
                    filterName: "", // Will be filled by notifyAll
                    updateMask,
                },
            },
        };
        this.notifyAll(subMessage, user, oldUser);
    }

    public removeUser(watcher: Socket) {
        const userData = watcher.getUserData();

        // Let's remove filters associated with this space if any left
        userData.spacesFilters.delete(this.name);

        const spaceUserId = userData.spaceUser.spaceUserId;
        if (!spaceUserId) {
            throw new Error("spaceUserId not found");
        }
        this.clientWatchers.delete(spaceUserId);
        debug(`${this.name} : watcher removed ${userData.name}. Watcher count ${this.clientWatchers.size}`);

        const pusherToBackSpaceMessage: PusherToBackSpaceMessage = {
            message: {
                $case: "removeSpaceUserMessage",
                removeSpaceUserMessage: {
                    spaceName: this.name,
                    spaceUserId,
                },
            },
        };

        this.spaceStreamToPusher.write(pusherToBackSpaceMessage);
        debug(`${this.name} : user remove sent ${spaceUserId}`);
        this.localRemoveUser(spaceUserId);
    }
    public localRemoveUser(spaceUserId: string) {
        const user = this.users.get(spaceUserId);
        if (user) {
            this.users.delete(spaceUserId);
            debug(`${this.name} : user removed ${spaceUserId}. User count ${this.users.size}`);

            const subMessage: SubMessage = {
                message: {
                    $case: "removeSpaceUserMessage",
                    removeSpaceUserMessage: {
                        spaceName: this.name,
                        spaceUserId,
                        filterName: "", // Will be filled by notifyAll
                    },
                },
            };
            this.notifyAll(subMessage, user);
        } else {
            console.error(`Space => ${this.name} : user not found ${spaceUserId}`);
            Sentry.captureException(`Space => ${this.name} : user not found ${spaceUserId}`);
        }
    }

    public localUpdateMetadata(metadata: { [key: string]: unknown }, emit = true) {
        // Set all value of metadata in the space
        for (const [key, value] of Object.entries(metadata)) {
            this._metadata.set(key, value);
        }

        if (emit === false) return;
        const subMessage: SubMessage = {
            message: {
                $case: "updateSpaceMetadataMessage",
                updateSpaceMetadataMessage: {
                    spaceName: this.name,
                    metadata: JSON.stringify(metadata),
                    filterName: undefined,
                },
            },
        };
        this.notifyAllMetadata(subMessage);
    }

    private notifyAllMetadata(subMessage: SubMessage) {
        this.clientWatchers.forEach((watcher) => {
            const socketData = watcher.getUserData();
            if (subMessage.message?.$case === "updateSpaceMetadataMessage") {
                debug(`${this.name} : metadata update sent to ${socketData.name}`);
                subMessage.message.updateSpaceMetadataMessage.spaceName = this.localName;

                socketData.emitInBatch(subMessage);
            }
        });
    }

    private notifyAll(subMessage: SubMessage, youngUser: SpaceUserExtended, oldUser: SpaceUserExtended | null = null) {
        this.clientWatchers.forEach((watcher) => {
            const socketData = watcher.getUserData();
            if (!this.isWatcherTargeted(watcher, youngUser) && !(oldUser && this.isWatcherTargeted(watcher, oldUser)))
                return;

            debug(`${this.name} : ${socketData.name} targeted`);

            const filterOfThisSpace = socketData.spacesFilters.get(this.name) ?? [];

            const filtersTargeted = filterOfThisSpace.filter(
                (spaceFilter) =>
                    this.filterOneUser(spaceFilter, youngUser) || (oldUser && this.filterOneUser(spaceFilter, oldUser))
            );

            filtersTargeted.forEach((spaceFilter) => {
                switch (subMessage.message?.$case) {
                    case "addSpaceUserMessage":
                        subMessage.message.addSpaceUserMessage.filterName = spaceFilter.filterName;
                        debug(`${this.name} : user ${youngUser.lowercaseName} add sent to ${socketData.name}`);
                        subMessage.message.addSpaceUserMessage.spaceName = this.localName;
                        socketData.emitInBatch(subMessage);
                        break;
                    case "removeSpaceUserMessage":
                        subMessage.message.removeSpaceUserMessage.spaceName = this.localName;
                        subMessage.message.removeSpaceUserMessage.filterName = spaceFilter.filterName;
                        socketData.emitInBatch(subMessage);
                        debug(`${this.name} : user ${youngUser.lowercaseName} remove sent to ${socketData.name}`);
                        break;
                    case "updateSpaceUserMessage": {
                        subMessage.message.updateSpaceUserMessage.filterName = spaceFilter.filterName;
                        subMessage.message.updateSpaceUserMessage.spaceName = this.localName;

                        const shouldRemoveUser: boolean = oldUser
                            ? this.filterOneUser(spaceFilter, oldUser) && !this.filterOneUser(spaceFilter, youngUser)
                            : false;

                        const shouldAddUser: boolean = oldUser
                            ? !this.filterOneUser(spaceFilter, oldUser) && this.filterOneUser(spaceFilter, youngUser)
                            : false;

                        if (!oldUser || (!shouldRemoveUser && !shouldAddUser)) {
                            socketData.emitInBatch(subMessage);
                            debug(`${this.name} : user ${youngUser.lowercaseName} update sent to ${socketData.name}`);
                            return;
                        }

                        if (shouldAddUser) {
                            this.notifyMeAddUser(watcher, youngUser, spaceFilter.filterName);
                            debug(
                                `${this.name} : user ${youngUser.lowercaseName} update caused add user sent to ${socketData.name}`
                            );
                            return;
                        }

                        if (shouldRemoveUser) {
                            this.notifyMeRemoveUser(watcher, youngUser, spaceFilter.filterName);
                            debug(
                                `${this.name} : user ${youngUser.lowercaseName} update caused remove user sent to ${socketData.name}`
                            );
                            return;
                        }
                        break;
                    }
                }
            });
        });
    }

    public notifyMe(watcher: Socket, subMessage: SubMessage) {
        watcher.getUserData().emitInBatch(subMessage);
    }

    private isWatcherTargeted(watcher: Socket, user: SpaceUserExtended) {
        const filtersOfThisSpace = watcher.getUserData().spacesFilters.get(this.name) ?? [];
        return filtersOfThisSpace.filter((spaceFilter) => this.filterOneUser(spaceFilter, user)).length > 0;
    }

    public filter(
        spaceFilter: SpaceFilterMessage,
        users: Map<string, SpaceUserExtended> | null = null
    ): Map<string, SpaceUserExtended> {
        const usersFiltered = new Map<string, SpaceUserExtended>();
        const usersToFilter = users ?? this.users;
        usersToFilter.forEach((user) => {
            if (this.filterOneUser(spaceFilter, user)) {
                usersFiltered.set(user.spaceUserId, user);
            }
        });
        return usersFiltered;
    }

    private filterOneUser(spaceFilters: SpaceFilterMessage, user: SpaceUserExtended): boolean {
        if (!spaceFilters.filter) {
            // Sentry event is commented because the line below can cause a complete explosion of number of events sent
            // to Sentry
            //Sentry.captureException("Empty filter received" + spaceFilters.spaceName);
            console.error("Empty filter received");
            return false;
        }

        switch (spaceFilters.filter.$case) {
            case "spaceFilterContainName": {
                const spaceFilterContainName = spaceFilters.filter.spaceFilterContainName;
                return user.lowercaseName.includes(spaceFilterContainName.value.toLowerCase());
            }
            case "spaceFilterEverybody": {
                return true;
            }
            case "spaceFilterLiveStreaming": {
                return /*(user.screenSharingState || user.microphoneState || user.cameraState) &&*/ user.megaphoneState;
            }
            default: {
                const _exhaustiveCheck: never = spaceFilters.filter;
            }
        }
        return false;
    }

    public handleAddFilter(watcher: Socket, addSpaceFilterMessage: AddSpaceFilterMessage) {
        const newFilter = addSpaceFilterMessage.spaceFilterMessage;
        if (!newFilter) {
            throw new Error("Filter is required in addSpaceFilterMessage");
        }
        debug(`${this.name} : filter added (${newFilter.filterName}) for ${watcher.getUserData().userId}`);
        const newData = this.filter(newFilter);
        const userData = watcher.getUserData();
        const currentSpaceFilterList = userData.spacesFilters.get(this.name) ?? [];
        userData.spacesFilters.set(this.name, [...(currentSpaceFilterList || []), newFilter]);
        this.delta(watcher, new Map(), newData, newFilter.filterName);
    }

    public handleUpdateFilter(watcher: Socket, updateSpaceFilterMessage: UpdateSpaceFilterMessage) {
        const newFilter = updateSpaceFilterMessage.spaceFilterMessage;
        if (newFilter) {
            const oldFilter = watcher
                .getUserData()
                .spacesFilters.get(this.name)
                ?.find((filter) => filter.filterName === newFilter.filterName);
            if (oldFilter) {
                debug(`${this.name} : filter updated (${newFilter.filterName}) for ${watcher.getUserData().userId}`);
                const usersInOldFilter = this.filter(oldFilter);
                const usersInNewFilter = this.filter(newFilter);
                this.delta(watcher, usersInOldFilter, usersInNewFilter, newFilter.filterName);
            }
        }
    }

    public handleRemoveFilter(watcher: Socket, removeSpaceFilterMessage: RemoveSpaceFilterMessage) {
        const oldFilter = removeSpaceFilterMessage.spaceFilterMessage;
        if (!oldFilter) return;

        const socketData = watcher.getUserData();
        const spaceFilters = socketData.spacesFilters.get(this.name);
        if (spaceFilters) {
            socketData.spacesFilters.set(
                this.name,
                spaceFilters.filter((filter) => filter.filterName !== oldFilter.filterName)
            );
        } else {
            console.warn(
                `SocketManager => handleRemoveSpaceFilterMessage => spacesFilter ${removeSpaceFilterMessage.spaceFilterMessage?.filterName} is undefined`
            );
        }
        debug(`${this.name} : filter removed (${oldFilter.filterName}) for ${watcher.getUserData().userId}`);

        //const oldUsers = this.filter(oldFilter);
        //this.delta(watcher, oldUsers, new Map(), undefined);
    }

    private delta(
        watcher: Socket,
        oldData: Map<string, SpaceUserExtended>,
        newData: Map<string, SpaceUserExtended>,
        filterName: string
    ) {
        let addedUsers = 0;
        // Check delta between responses by old and new filter
        newData.forEach((user) => {
            if (!oldData.has(user.spaceUserId)) {
                this.notifyMeAddUser(watcher, user, filterName);
                addedUsers++;
            }
        });

        let removedUsers = 0;
        oldData.forEach((user) => {
            if (!newData.has(user.spaceUserId)) {
                this.notifyMeRemoveUser(watcher, user, filterName);
                removedUsers++;
            }
        });

        debug(
            `${this.name} : filter calculated for ${
                watcher.getUserData().userId
            } (${addedUsers} added, ${removedUsers} removed)`
        );
    }

    private notifyMeAddUser(watcher: Socket, user: SpaceUserExtended, filterName: string) {
        const subMessage: SubMessage = {
            message: {
                $case: "addSpaceUserMessage",
                addSpaceUserMessage: {
                    spaceName: this.localName,
                    user,
                    filterName,
                },
            },
        };
        this.notifyMe(watcher, subMessage);
    }

    /*private notifyMeUpdateUser(watcher: Socket, user: SpaceUserExtended, filterName: string | undefined) {
        const subMessage: SubMessage = {
            message: {
                $case: "updateSpaceUserMessage",
                updateSpaceUserMessage: {
                    spaceName: this.removeSpaceNamePrefix(this.name, watcher.getUserData().world),
                    user,
                    filterName,
                },
            },
        };
        this.notifyMe(watcher, subMessage);
    }*/
    private notifyMeRemoveUser(watcher: Socket, user: SpaceUserExtended, filterName: string) {
        const subMessage: SubMessage = {
            message: {
                $case: "removeSpaceUserMessage",
                removeSpaceUserMessage: {
                    spaceName: this.localName,
                    spaceUserId: user.spaceUserId,
                    filterName,
                },
            },
        };
        this.notifyMe(watcher, subMessage);
    }

    public isEmpty() {
        return this.clientWatchers.size === 0;
    }

    public sendPublicEvent(message: NonUndefinedFields<PublicEvent>) {
        const spaceEvent = noUndefined(message.spaceEvent);

        // FIXME: this should be unnecessary because of the noUndefined call above
        // noUndefined does not seem to return an appropriate type
        if (!spaceEvent.event) {
            throw new Error("Event is required in spaceEvent");
        }

        const sender = this.users.get(message.senderUserId);

        if (!sender) {
            throw new Error(`Public message sender ${message.senderUserId} not found in space ${this.name}`);
        }

        this.notifyAllUsers(
            {
                message: {
                    $case: "publicEvent",
                    publicEvent: {
                        senderUserId: message.senderUserId,
                        spaceEvent: {
                            event: this.eventProcessor.processPublicEvent(spaceEvent.event, sender),
                        },
                        // The name of the space in the browser is the local name (i.e. the name without the "world" prefix)
                        spaceName: this.localName,
                    },
                },
            },
            message.senderUserId
        );
    }

    public sendPrivateEvent(message: NonUndefinedFields<PrivateEvent>) {
        // [...this.clientWatchers.values()].forEach((watcher) => {
        //     const socketData = watcher.getUserData();
        //     if (socketData.userId === message.receiverUserId) {
        //         socketData.emitInBatch({
        //             message: {
        //                 $case: "privateEvent",
        //                 privateEvent: message,
        //             },
        //         });
        //     }
        // });
        const spaceEvent = noUndefined(message.spaceEvent);

        // FIXME: this should be unnecessary because of the noUndefined call above
        // noUndefined does not seem to return an appropriate type
        if (!spaceEvent.event) {
            throw new Error("Event is required in spaceEvent");
        }

        const receiver = this.users.get(message.receiverUserId);

        if (!receiver) {
            throw new Error(`Private message receiver ${message.receiverUserId} not found in space ${this.name}`);
        }

        const sender = this.users.get(message.senderUserId);

        if (!sender) {
            throw new Error(`Private message sender ${message.senderUserId} not found in space ${this.name}`);
        }

        receiver.client?.getUserData().emitInBatch({
            message: {
                $case: "privateEvent",
                privateEvent: {
                    senderUserId: message.senderUserId,
                    receiverUserId: message.receiverUserId,
                    spaceEvent: {
                        event: this.eventProcessor.processPrivateEvent(spaceEvent.event, sender, receiver),
                    },
                    // The name of the space in the browser is the local name (i.e. the name without the "world" prefix)
                    spaceName: this.localName,
                },
            },
        });
    }

    /**
     * Notify all users in this space expect the sender. Notification is done despite users watching or not.
     * It is used solely for public events.
     */
    private notifyAllUsers(subMessage: SubMessage, senderId: string) {
        /*this.clientWatchers.forEach((watcher) => {
            const socketData = watcher.getUserData();
            debug(`${this.name} : kickOff sent to ${socketData.name}`);
            socketData.emitInBatch(subMessage);
        });*/

        for (const user of this.users.values()) {
            if (user.client && user.spaceUserId !== senderId) {
                user.client.getUserData().emitInBatch(subMessage);
            }
        }
    }

    public forwardMessageToSpaceBack(pusherToBackSpaceMessage: PusherToBackSpaceMessage["message"]) {
        this.spaceStreamToPusher.write({
            message: pusherToBackSpaceMessage,
        });
    }

    get metadata(): Map<string, unknown> {
        return this._metadata;
    }
    /**
     * Cleans up the space when the space is deleted (only useful when the connection to the back is closed or in timeout)
     */
    public cleanup(): void {
        // Send a message to all
        for (const [spaceUserId, user] of this.users.entries()) {
            const subMessage: SubMessage = {
                message: {
                    $case: "removeSpaceUserMessage",
                    removeSpaceUserMessage: {
                        spaceName: this.name,
                        spaceUserId,
                        filterName: "", // Will be filled by notifyAll
                    },
                },
            };
            this.notifyAll(subMessage, user);
        }
        // Let's remove any reference to the space in the watchers
        for (const watcher of this.clientWatchers.values()) {
            const socketData = watcher.getUserData();
            const filters = socketData.spacesFilters.get(this.name);
            if (filters) {
                socketData.spacesFilters.set(
                    this.name,
                    filters.filter((filter) => filter.spaceName !== this.name)
                );
            }
            const success = socketData.spaces.delete(this.name);
            if (!success) {
                console.error(`Impossible to remove space ${this.name} from the user's spaces. Space not found.`);
                Sentry.captureException(new Error(`Impossible to remove space ${this.name} from the user's spaces.`));
            }
        }
        // Finally, let's send a message to the front to warn that the space is deleted
    }
}
