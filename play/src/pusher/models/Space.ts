import { CustomJsonReplacerInterface } from "./CustomJsonReplacerInterface";
import {
    PartialSpaceUser,
    PusherToBackSpaceMessage,
    RemoveSpaceFilterMessage,
    SpaceFilterMessage,
    SpaceUser,
    SubMessage,
    UpdateSpaceFilterMessage,
} from "@workadventure/messages";
import Debug from "debug";
import { BackSpaceConnection, ExSocketInterface } from "./Websocket/ExSocketInterface";

const debug = Debug("space");

const isSameUser = (a: SpaceUser, b: SpaceUser) => a.uuid === b.uuid;

export class Space implements CustomJsonReplacerInterface {
    private users: Map<string, SpaceUser>;

    private clientWatchers: Map<string, ExSocketInterface>;

    constructor(
        public readonly name: string,
        private spaceStreamToPusher: BackSpaceConnection,
        public backId: number,
        watcher: ExSocketInterface
    ) {
        this.users = new Map<string, SpaceUser>();
        this.clientWatchers = new Map<string, ExSocketInterface>();
        this.clientWatchers.set(watcher.userUuid, watcher);
        debug(`created : ${name}`);
    }

    public addClientWatcher(watcher: ExSocketInterface) {
        this.clientWatchers.set(watcher.userUuid, watcher);
    }

    public addUser(spaceUser: SpaceUser) {
        const pusherToBackSpaceMessage: PusherToBackSpaceMessage = {
            message: {
                $case: "addSpaceUserMessage",
                addSpaceUserMessage: {
                    spaceName: this.name,
                    user: spaceUser,
                    filterName: undefined,
                },
            },
        };
        this.spaceStreamToPusher.write(pusherToBackSpaceMessage);
        debug(`${this.name} : user add sent ${spaceUser.uuid}`);
        this.localAddUser(spaceUser);
    }
    public localAddUser(spaceUser: SpaceUser) {
        this.users.set(spaceUser.uuid, spaceUser);
        debug(`${this.name} : user added ${spaceUser.uuid}`);

        const subMessage: SubMessage = {
            message: {
                $case: "addSpaceUserMessage",
                addSpaceUserMessage: {
                    spaceName: this.name,
                    user: spaceUser,
                    filterName: undefined,
                },
            },
        };
        this.notifyAll(subMessage);
    }

    public updateUser(spaceUser: PartialSpaceUser) {
        const pusherToBackSpaceMessage: PusherToBackSpaceMessage = {
            message: {
                $case: "updateSpaceUserMessage",
                updateSpaceUserMessage: {
                    spaceName: this.name,
                    user: spaceUser,
                    filterName: undefined,
                },
            },
        };
        this.spaceStreamToPusher.write(pusherToBackSpaceMessage);
        debug(`${this.name} : user update sent ${spaceUser.uuid}`);
        this.localUpdateUser(spaceUser);
    }
    public localUpdateUser(spaceUser: PartialSpaceUser) {
        const user = this.users.get(spaceUser.uuid);
        if (user) {
            if (spaceUser.tags.length > 0) {
                user.tags = spaceUser.tags;
            }
            if (spaceUser.name) {
                user.name = spaceUser.name;
            }
            if (spaceUser.playUri) {
                user.playUri = spaceUser.playUri;
            }
            if (spaceUser.color) {
                user.color = spaceUser.color;
            }
            if (spaceUser.characterLayers.length > 0) {
                user.characterLayers = spaceUser.characterLayers;
            }
            if (spaceUser.isLogged !== undefined) {
                user.isLogged = spaceUser.isLogged;
            }
            if (spaceUser.availabilityStatus !== undefined) {
                user.availabilityStatus = spaceUser.availabilityStatus;
            }
            if (spaceUser.roomName) {
                user.roomName = spaceUser.roomName;
            }
            if (spaceUser.visitCardUrl) {
                user.visitCardUrl = spaceUser.visitCardUrl;
            }
            if (spaceUser.screenSharing !== undefined) {
                user.screenSharing = spaceUser.screenSharing;
            }
            if (spaceUser.audioSharing !== undefined) {
                user.audioSharing = spaceUser.audioSharing;
            }
            if (spaceUser.videoSharing !== undefined) {
                user.videoSharing = spaceUser.videoSharing;
            }
            this.users.set(spaceUser.uuid, user);
            debug(`${this.name} : user updated ${spaceUser.uuid}`);

            const subMessage: SubMessage = {
                message: {
                    $case: "updateSpaceUserMessage",
                    updateSpaceUserMessage: {
                        spaceName: this.name,
                        user: spaceUser,
                        filterName: undefined,
                    },
                },
            };
            this.notifyAll(subMessage);
        }
    }

    public removeUser(userUuid: string) {
        const pusherToBackSpaceMessage: PusherToBackSpaceMessage = {
            message: {
                $case: "removeSpaceUserMessage",
                removeSpaceUserMessage: {
                    spaceName: this.name,
                    userUuid,
                    filterName: undefined,
                },
            },
        };
        this.spaceStreamToPusher.write(pusherToBackSpaceMessage);
        debug(`${this.name} : user remove sent ${userUuid}`);
        this.localRemoveUser(userUuid);
    }
    public localRemoveUser(userUuid: string) {
        const user = this.users.get(userUuid);
        this.users.delete(userUuid);
        debug(`${this.name} : user removed ${userUuid}`);

        const subMessage: SubMessage = {
            message: {
                $case: "removeSpaceUserMessage",
                removeSpaceUserMessage: {
                    spaceName: this.name,
                    userUuid,
                    filterName: undefined,
                },
            },
        };

        this.notifyAll(subMessage, user);
    }

    private notifyAll(subMessage: SubMessage, user: SpaceUser | undefined = undefined) {
        [...this.clientWatchers.values()]
            .filter((watcher) => this.isWatcherTargeted(watcher, subMessage, user))
            .forEach((watcher) => {
                const filtersTargeted = watcher.spacesFilters.filter((spaceFilter) =>
                    this.isFilterTargeted(spaceFilter, subMessage, user)
                );
                if (filtersTargeted.length > 0) {
                    filtersTargeted.forEach((spaceFilter) => {
                        if (subMessage.message?.$case === "addSpaceUserMessage") {
                            subMessage.message.addSpaceUserMessage.filterName = spaceFilter.filterName;
                        } else if (subMessage.message?.$case === "updateSpaceUserMessage") {
                            subMessage.message.updateSpaceUserMessage.filterName = spaceFilter.filterName;
                        } else if (subMessage.message?.$case === "removeSpaceUserMessage") {
                            subMessage.message.removeSpaceUserMessage.filterName = spaceFilter.filterName;
                        }
                        watcher.emitInBatch(subMessage);
                    });
                } else {
                    watcher.emitInBatch(subMessage);
                }
            });
    }

    public notifyMe(watcher: ExSocketInterface, subMessage: SubMessage, user: SpaceUser | undefined = undefined) {
        watcher.emitInBatch(subMessage);
    }

    private isWatcherTargeted(
        watcher: ExSocketInterface,
        subMessage: SubMessage,
        user: SpaceUser | undefined = undefined
    ) {
        const filtersOfThisSpace = watcher.spacesFilters.filter((spaceFilters) => spaceFilters.spaceName === this.name);
        return (
            filtersOfThisSpace.length === 0 ||
            filtersOfThisSpace.filter((spaceFilter) => this.isFilterTargeted(spaceFilter, subMessage, user)).length > 0
        );
    }

    private isFilterTargeted(
        spaceFilter: SpaceFilterMessage,
        subMessage: SubMessage,
        user: SpaceUser | undefined = undefined
    ) {
        if (spaceFilter.spaceName === this.name) {
            let user_ = user;
            if (subMessage.message?.$case === "addSpaceUserMessage") {
                user_ = subMessage.message.addSpaceUserMessage.user;
            } else if (subMessage.message?.$case === "updateSpaceUserMessage") {
                // I'm sure user uuid is existing
                user_ = this.users.get(subMessage.message.updateSpaceUserMessage.user?.uuid as string);
            }
            if (user_) {
                return this.filterOneUser(spaceFilter, user_);
            }
        }
        return false;
    }

    public filter(spaceFilter: SpaceFilterMessage) {
        return [...this.users.values()].filter((user) => this.filterOneUser(spaceFilter, user));
    }

    private filterOneUser(spaceFilters: SpaceFilterMessage, user: SpaceUser) {
        if (spaceFilters.filter?.$case === "spaceFilterContainName") {
            const spaceFilterContainName = spaceFilters.filter.spaceFilterContainName;
            if (user.name.includes(spaceFilterContainName.value)) {
                return true;
            }
        }
        return false;
    }

    public handleAddFilter(watcher: ExSocketInterface, updateSpaceFilterMessage: UpdateSpaceFilterMessage) {
        const newFilter = updateSpaceFilterMessage.spaceFilterMessage;
        if (newFilter) {
            debug(`${this.name} : filter added (${newFilter.filterName}) for ${watcher.userUuid}`);
            const oldData = [...this.users.values()];
            const newData = this.filter(newFilter);
            this.delta(watcher, oldData, newData, newFilter.filterName);
        }
    }

    public handleUpdateFilter(watcher: ExSocketInterface, updateSpaceFilterMessage: UpdateSpaceFilterMessage) {
        const newFilter = updateSpaceFilterMessage.spaceFilterMessage;
        if (newFilter) {
            const oldFilter = watcher.spacesFilters.find((filter) => filter.filterName === newFilter.filterName);
            if (oldFilter) {
                debug(`${this.name} : filter updated (${newFilter.filterName}) for ${watcher.userUuid}`);
                const oldData = this.filter(oldFilter);
                const newData = this.filter(newFilter);
                this.delta(watcher, oldData, newData, newFilter.filterName);
            }
        }
    }

    public handleRemoveFilter(watcher: ExSocketInterface, removeSpaceFilterMessage: RemoveSpaceFilterMessage) {
        const oldFilter = removeSpaceFilterMessage.spaceFilterMessage;
        if (oldFilter) {
            debug(`${this.name} : filter removed (${oldFilter.filterName}) for ${watcher.userUuid}`);
            const oldData = this.filter(oldFilter);
            const newData = [...this.users.values()];
            this.delta(watcher, oldData, newData, undefined);
        }
    }

    private delta(
        watcher: ExSocketInterface,
        oldData: SpaceUser[],
        newData: SpaceUser[],
        filterName: string | undefined
    ) {
        // Check delta between responses by old and new filter
        const addedUsers = newData.filter(
            (leftValue) => !oldData.some((rightValue) => isSameUser(leftValue, rightValue))
        );
        addedUsers.forEach((user) => {
            const subMessage: SubMessage = {
                message: {
                    $case: "addSpaceUserMessage",
                    addSpaceUserMessage: {
                        spaceName: this.name,
                        user,
                        filterName,
                    },
                },
            };
            this.notifyMe(watcher, subMessage);
        });
        const removedUsers = oldData.filter(
            (leftValue) => !newData.some((rightValue) => isSameUser(leftValue, rightValue))
        );
        removedUsers.forEach((user) => {
            const subMessage: SubMessage = {
                message: {
                    $case: "removeSpaceUserMessage",
                    removeSpaceUserMessage: {
                        spaceName: this.name,
                        userUuid: user.uuid,
                        filterName,
                    },
                },
            };
            this.notifyMe(watcher, subMessage);
        });
        debug(
            `${this.name} : filter calculated for ${watcher.userUuid} (${addedUsers.length} added, ${removedUsers.length} removed)`
        );
    }

    public isEmpty() {
        return this.users.size === 0;
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
}
