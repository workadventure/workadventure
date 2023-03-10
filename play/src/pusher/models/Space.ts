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

type SpaceUserExtended = { lowercaseName: string } & SpaceUser;

const debug = Debug("space");

export class Space implements CustomJsonReplacerInterface {
    private readonly users: Map<string, SpaceUserExtended>;

    private clientWatchers: Map<string, ExSocketInterface>;

    constructor(
        public readonly name: string,
        private spaceStreamToPusher: BackSpaceConnection,
        public backId: number,
        watcher: ExSocketInterface
    ) {
        this.users = new Map<string, SpaceUserExtended>();
        this.clientWatchers = new Map<string, ExSocketInterface>();
        this.addClientWatcher(watcher);
        debug(`created : ${name}`);
    }

    public addClientWatcher(watcher: ExSocketInterface) {
        this.clientWatchers.set(watcher.userUuid, watcher);
    }

    // FIXME: Is used ?
    public removeClientWatcher(watcher: ExSocketInterface) {
        this.clientWatchers.delete(watcher.userUuid);
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
        const user = { ...spaceUser, lowercaseName: spaceUser.name.toLowerCase() };
        this.users.set(spaceUser.uuid, user);
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
        this.notifyAll(subMessage, user);
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
                user.lowercaseName = spaceUser.name.toLowerCase();
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
            this.notifyAll(subMessage, user);
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
        if (user) {
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
    }

    private notifyAll(subMessage: SubMessage, user: SpaceUserExtended) {
        [...this.clientWatchers.values()]
            .filter((watcher) => this.isWatcherTargeted(watcher, user))
            .forEach((watcher) => {
                const filtersTargeted = watcher.spacesFilters.filter((spaceFilter) =>
                    this.isFilterTargeted(spaceFilter, user)
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

    public notifyMe(watcher: ExSocketInterface, subMessage: SubMessage) {
        watcher.emitInBatch(subMessage);
    }

    private isWatcherTargeted(watcher: ExSocketInterface, user: SpaceUserExtended) {
        const filtersOfThisSpace = watcher.spacesFilters.filter((spaceFilters) => spaceFilters.spaceName === this.name);
        return (
            filtersOfThisSpace.length === 0 ||
            filtersOfThisSpace.filter((spaceFilter) => this.isFilterTargeted(spaceFilter, user)).length > 0
        );
    }

    private isFilterTargeted(spaceFilter: SpaceFilterMessage, user: SpaceUserExtended) {
        if (spaceFilter.spaceName === this.name) {
            return this.filterOneUser(spaceFilter, user);
        }
        return false;
    }

    public filter(spaceFilter: SpaceFilterMessage): Map<string, SpaceUser> {
        const users = new Map<string, SpaceUser>();
        this.users.forEach((user) => {
            if (this.filterOneUser(spaceFilter, user)) {
                users.set(user.uuid, user);
            }
        });
        return users;
    }

    private filterOneUser(spaceFilters: SpaceFilterMessage, user: SpaceUserExtended): boolean {
        if (!spaceFilters.filter) {
            console.error("Empty filter received");
            return false;
        }

        switch (spaceFilters.filter.$case) {
            case "spaceFilterContainName": {
                const spaceFilterContainName = spaceFilters.filter.spaceFilterContainName;
                return user.lowercaseName.includes(spaceFilterContainName.value.toLowerCase());
            }
            default: {
                const _exhaustiveCheck: never = spaceFilters.filter.$case;
            }
        }
        return false;
    }

    public handleAddFilter(watcher: ExSocketInterface, updateSpaceFilterMessage: UpdateSpaceFilterMessage) {
        const newFilter = updateSpaceFilterMessage.spaceFilterMessage;
        if (newFilter) {
            debug(`${this.name} : filter added (${newFilter.filterName}) for ${watcher.userUuid}`);
            const newData = this.filter(newFilter);
            this.delta(watcher, this.users, newData, newFilter.filterName);
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
            this.delta(watcher, oldData, this.users, undefined);
        }
    }

    private delta(
        watcher: ExSocketInterface,
        oldData: Map<string, SpaceUser>,
        newData: Map<string, SpaceUser>,
        filterName: string | undefined
    ) {
        let addedUsers = 0;
        // Check delta between responses by old and new filter
        newData.forEach((user) => {
            if (!oldData.has(user.uuid)) {
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
                addedUsers++;
            }
        });

        let removedUsers = 0;
        oldData.forEach((user) => {
            if (!newData.has(user.uuid)) {
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
                removedUsers++;
            }
        });

        debug(
            `${this.name} : filter calculated for ${watcher.userUuid} (${addedUsers} added, ${removedUsers} removed)`
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
