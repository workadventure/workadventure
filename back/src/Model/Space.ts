import { applyFieldMask } from "protobuf-fieldmask";
import merge from "lodash/merge";
import * as Sentry from "@sentry/node";
import {
    AddSpaceUserMessage,
    BackToPusherSpaceMessage,
    PrivateEvent,
    PublicEvent,
    RemoveSpaceUserMessage,
    SpaceUser,
    UpdateSpaceMetadataMessage,
} from "@workadventure/messages";
import Debug from "debug";
import { CustomJsonReplacerInterface } from "./CustomJsonReplacerInterface";
import { SpacesWatcher } from "./SpacesWatcher";

const debug = Debug("space");

export class Space implements CustomJsonReplacerInterface {
    readonly name: string;
    private users: Map<SpacesWatcher, Map<string, SpaceUser>>;
    private metadata: Map<string, unknown>;

    constructor(name: string) {
        this.name = name;
        this.users = new Map<SpacesWatcher, Map<string, SpaceUser>>();
        this.metadata = new Map<string, unknown>();
        debug(`${name} => created`);
    }

    public addUser(sourceWatcher: SpacesWatcher, spaceUser: SpaceUser) {
        try {
            const usersList = this.usersList(sourceWatcher);
            usersList.set(spaceUser.spaceUserId, spaceUser);
            this.notifyWatchers(
                {
                    message: {
                        $case: "addSpaceUserMessage",
                        addSpaceUserMessage: AddSpaceUserMessage.fromPartial({
                            spaceName: this.name,
                            user: spaceUser,
                        }),
                    },
                },
                sourceWatcher
            );
            debug(`${this.name} : user => added ${spaceUser.spaceUserId}`);
        } catch (e) {
            console.error("Error while adding user", e);
            Sentry.captureException(e);
            debug("Error while adding user", e);
            // If we have an error, it means that the user list is not initialized
            // So we need to remove user from the source watcher
            this.notifyWatchers(
                {
                    message: {
                        $case: "removeSpaceUserMessage",
                        removeSpaceUserMessage: RemoveSpaceUserMessage.fromPartial({
                            spaceName: this.name,
                            spaceUserId: spaceUser.spaceUserId,
                        }),
                    },
                },
                sourceWatcher
            );
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

            const updateValues = applyFieldMask(spaceUser, updateMask);
            merge(user, updateValues);
            usersList.set(spaceUser.spaceUserId, user);

            this.notifyWatchers(
                {
                    message: {
                        $case: "updateSpaceUserMessage",
                        updateSpaceUserMessage: {
                            spaceName: this.name,
                            user: spaceUser,
                            updateMask,
                        },
                    },
                },
                sourceWatcher
            );
        } catch (e) {
            console.error("Error while updating user", e);
            Sentry.captureException(e);
            debug("Error while updating user", e);
            // If we have an error, it means that the user list is not initialized
            // So we need to remove user from the source watcher
            this.notifyWatchers(
                {
                    message: {
                        $case: "removeSpaceUserMessage",
                        removeSpaceUserMessage: RemoveSpaceUserMessage.fromPartial({
                            spaceName: this.name,
                            spaceUserId: spaceUser.spaceUserId,
                        }),
                    },
                },
                sourceWatcher
            );
        }
    }
    public removeUser(sourceWatcher: SpacesWatcher, spaceUserId: string) {
        try {
            const usersList = this.usersList(sourceWatcher);
            usersList.delete(spaceUserId);
            debug(`${this.name} : user => removed ${spaceUserId}`);

            if (usersList.size === 0) {
                debug(`${this.name} : users list => deleted ${sourceWatcher.id}`);
                this.users.delete(sourceWatcher);
            }
        } catch (e) {
            console.error("Error while removing user", e);
            Sentry.captureException(e);
            debug("Error while removing user", e);
        } finally {
            this.notifyWatchers(
                {
                    message: {
                        $case: "removeSpaceUserMessage",
                        removeSpaceUserMessage: RemoveSpaceUserMessage.fromPartial({
                            spaceName: this.name,
                            spaceUserId: spaceUserId,
                        }),
                    },
                },
                sourceWatcher
            );
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

    public addWatcher(watcher: SpacesWatcher) {
        this.users.set(watcher, new Map<string, SpaceUser>());
        debug(`Space ${this.name} => watcher added ${watcher.id}`);
        for (const spaceUsers of this.users.values()) {
            for (const spaceUser of spaceUsers.values()) {
                watcher.write({
                    message: {
                        $case: "addSpaceUserMessage",
                        addSpaceUserMessage: AddSpaceUserMessage.fromPartial({
                            spaceName: this.name,
                            user: spaceUser,
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
        this.users.delete(watcher);
        debug(`${this.name} => watcher removed ${watcher.id}`);
    }

    /**
     * Notify all watchers expect the one that sent the message
     */
    private notifyWatchers(message: BackToPusherSpaceMessage, exceptWatcher?: SpacesWatcher) {
        for (const watcher_ of this.users.keys()) {
            if (exceptWatcher && watcher_.id === exceptWatcher.id) {
                continue;
            }
            watcher_.write(message);
        }
    }

    public canBeDeleted(): boolean {
        return this.users.size === 0;
    }

    private usersList(watcher: SpacesWatcher): Map<string, SpaceUser> {
        const usersList = this.users.get(watcher);
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
        this.notifyWatchers({
            message: {
                $case: "publicEvent",
                publicEvent,
            },
        });
    }

    public dispatchPrivateEvent(privateEvent: PrivateEvent) {
        // Let's notify the watcher that contains the user
        for (const [watcher, users] of this.users.entries()) {
            if (users.has(privateEvent.receiverUserId)) {
                watcher.write({
                    message: {
                        $case: "privateEvent",
                        privateEvent,
                    },
                });
            }
        }
    }
}
