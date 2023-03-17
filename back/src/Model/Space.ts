import { CustomJsonReplacerInterface } from "./CustomJsonReplacerInterface";
import { SpacesWatcher } from "./SpacesWatcher";
import {
    AddSpaceUserMessage,
    BackToPusherSpaceMessage,
    PartialSpaceUser,
    RemoveSpaceUserMessage,
    SpaceUser,
    UpdateSpaceUserMessage,
} from "@workadventure/messages";
import Debug from "debug";

const debug = Debug("space");

export class Space implements CustomJsonReplacerInterface {
    readonly name: string;
    private users: Map<SpacesWatcher, Map<string, SpaceUser>>;

    constructor(name: string) {
        this.name = name;
        this.users = new Map<SpacesWatcher, Map<string, SpaceUser>>();
        debug(`${name} => created`);
    }

    public addUser(watcher: SpacesWatcher, spaceUser: SpaceUser) {
        const usersList = this.usersList(watcher);
        usersList.set(spaceUser.uuid, spaceUser);
        this.notifyWatchers(watcher, {
            message: {
                $case: "addSpaceUserMessage",
                addSpaceUserMessage: AddSpaceUserMessage.fromPartial({
                    spaceName: this.name,
                    user: spaceUser,
                }),
            },
        });
        debug(`${this.name} : user => added ${spaceUser.uuid}`);
    }
    public updateUser(watcher: SpacesWatcher, spaceUser: PartialSpaceUser) {
        const usersList = this.usersList(watcher);
        const user = usersList.get(spaceUser.uuid);
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
            if (spaceUser.microphoneState !== undefined) {
                user.microphoneState = spaceUser.microphoneState;
            }
            if (spaceUser.cameraState !== undefined) {
                user.cameraState = spaceUser.cameraState;
            }
            if (spaceUser.megaphoneState !== undefined) {
                user.megaphoneState = spaceUser.megaphoneState;
            }
            if (spaceUser.jitsiParticipantId){
                user.jitsiParticipantId = spaceUser.jitsiParticipantId;
            }
            usersList.set(spaceUser.uuid, user);
            this.notifyWatchers(watcher, {
                message: {
                    $case: "updateSpaceUserMessage",
                    updateSpaceUserMessage: UpdateSpaceUserMessage.fromPartial({
                        spaceName: this.name,
                        user: spaceUser,
                    }),
                },
            });
            debug(`${this.name} : user => updated ${spaceUser.uuid}`);
        }
    }
    public removeUser(watcher: SpacesWatcher, uuid: string) {
        const usersList = this.usersList(watcher);
        usersList.delete(uuid);

        this.notifyWatchers(watcher, {
            message: {
                $case: "removeSpaceUserMessage",
                removeSpaceUserMessage: RemoveSpaceUserMessage.fromPartial({
                    spaceName: this.name,
                    userUuid: uuid,
                }),
            },
        });
        debug(`${this.name} : user => removed ${uuid}`);
    }

    public addWatcher(watcher: SpacesWatcher) {
        this.users.set(watcher, new Map<string, SpaceUser>());
        debug(`Space ${this.name} => watcher added ${watcher.uuid}`);
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
    }
    public removeWatcher(watcher: SpacesWatcher) {
        this.users.delete(watcher);
        debug(`${this.name} => watcher removed ${watcher.uuid}`);
    }

    private notifyWatchers(watcher: SpacesWatcher, message: BackToPusherSpaceMessage) {
        for (const watcher_ of this.users.keys()) {
            if (watcher_.uuid !== watcher.uuid) {
                watcher_.write(message);
            }
        }
    }

    public canBeDeleted(): boolean {
        return this.users.size === 0;
    }

    private usersList(watcher: SpacesWatcher): Map<string, SpaceUser> {
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
