import { applyFieldMask } from "protobuf-fieldmask";
import merge from "lodash/merge";
import * as Sentry from "@sentry/node";
import {
    AddSpaceUserMessage,
    BackToPusherSpaceMessage,
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
    private users: Map<SpacesWatcher, Map<number, SpaceUser>>;
    private metadata: Map<string, unknown>;

    constructor(name: string) {
        this.name = name;
        this.users = new Map<SpacesWatcher, Map<number, SpaceUser>>();
        this.metadata = new Map<string, unknown>();
        debug(`${name} => created`);
    }

    public addUser(watcher: SpacesWatcher, spaceUser: SpaceUser) {
        const usersList = this.usersList(watcher);
        usersList.set(spaceUser.id, spaceUser);
        this.notifyWatchers(watcher, {
            message: {
                $case: "addSpaceUserMessage",
                addSpaceUserMessage: AddSpaceUserMessage.fromPartial({
                    spaceName: this.name,
                    user: spaceUser,
                }),
            },
        });
        debug(`${this.name} : user => added ${spaceUser.id}`);
    }
    public updateUser(watcher: SpacesWatcher, spaceUser: SpaceUser, updateMask: string[]) {
        const usersList = this.usersList(watcher);
        const user = usersList.get(spaceUser.id);
        if (!user) {
            console.error("User not found in this space", spaceUser);
            Sentry.captureMessage(`User not found in this space ${spaceUser.id}`);
            return;
        }

        const updateValues = applyFieldMask(spaceUser, updateMask);

        merge(user, updateValues);

        usersList.set(spaceUser.id, user);
        this.notifyWatchers(watcher, {
            message: {
                $case: "updateSpaceUserMessage",
                updateSpaceUserMessage: {
                    spaceName: this.name,
                    user: spaceUser,
                    updateMask,
                    filterName: undefined,
                },
            },
        });
        debug(`${this.name} : user => updated ${spaceUser.id}`);
    }
    public removeUser(watcher: SpacesWatcher, id: number) {
        const usersList = this.usersList(watcher);
        usersList.delete(id);

        this.notifyWatchers(watcher, {
            message: {
                $case: "removeSpaceUserMessage",
                removeSpaceUserMessage: RemoveSpaceUserMessage.fromPartial({
                    spaceName: this.name,
                    userId: id,
                }),
            },
        });
        debug(`${this.name} : user => removed ${id}`);
    }

    public updateMetadata(watcher: SpacesWatcher, metadata: { [key: string]: unknown }) {
        for (const key in metadata) {
            this.metadata.set(key, metadata[key]);
        }

        this.notifyWatchers(watcher, {
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
        this.users.set(watcher, new Map<number, SpaceUser>());
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

    private notifyWatchers(watcher: SpacesWatcher, message: BackToPusherSpaceMessage) {
        for (const watcher_ of this.users.keys()) {
            if (watcher_.id !== watcher.id || message.message?.$case === "updateSpaceMetadataMessage") {
                watcher_.write(message);
            }
        }
    }

    public canBeDeleted(): boolean {
        return this.users.size === 0;
    }

    private usersList(watcher: SpacesWatcher): Map<number, SpaceUser> {
        const usersList = this.users.get(watcher);
        if (!usersList) {
            throw new Error("No users list associated to the watcher");
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
}
