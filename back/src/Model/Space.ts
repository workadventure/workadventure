import { CustomJsonReplacerInterface } from "./CustomJsonReplacerInterface";
import { SpacesWatcher, SpaceMessage } from "./SpacesWatcher";
import {
    AddSpaceUserMessage,
    RemoveSpaceUserMessage,
    SpaceUser,
    UpdateSpaceUserMessage,
} from "../Messages/generated/messages_pb";
import Debug from "debug";

const debug = Debug("space");

export class Space implements CustomJsonReplacerInterface {
    readonly name: string;
    private users: Map<SpacesWatcher, Map<string, SpaceUser>>;

    constructor(name: string) {
        this.name = name;
        this.users = new Map<SpacesWatcher, Map<string, SpaceUser>>();
        debug(`Space created : ${name}`);
    }

    public addUser(watcher: SpacesWatcher, spaceUser: SpaceUser) {
        const usersList = this.usersList(watcher);
        usersList.set(spaceUser.getUuid(), spaceUser);

        const message = new AddSpaceUserMessage();
        message.setSpacename(this.name);
        message.setUser(spaceUser);
        this.notifyWatchers(watcher, message);
        debug(`Space ${this.name} : space user added ${spaceUser.getUuid()}`);
    }
    public updateUser(watcher: SpacesWatcher, spaceUser: SpaceUser) {
        const usersList = this.usersList(watcher);
        usersList.set(spaceUser.getUuid(), spaceUser);

        const message = new UpdateSpaceUserMessage();
        message.setSpacename(this.name);
        message.setUser(spaceUser);
        this.notifyWatchers(watcher, message);
        debug(`Space ${this.name} : space user updated ${spaceUser.getUuid()}`);
    }
    public removeUser(watcher: SpacesWatcher, uuid: string) {
        const usersList = this.usersList(watcher);
        usersList.delete(uuid);

        const message = new RemoveSpaceUserMessage();
        message.setSpacename(this.name);
        message.setUseruuid(uuid);
        this.notifyWatchers(watcher, message);
        debug(`Space ${this.name} : space user removed ${uuid}`);
    }

    public addWatcher(watcher: SpacesWatcher) {
        this.users.set(watcher, new Map<string, SpaceUser>());
        debug(`Space ${this.name} : watched added ${watcher.uuid}`);
        [...this.users.values()].forEach((spaceUsers) => {
            [...spaceUsers.values()].forEach((spaceUser) => {
                const message = new AddSpaceUserMessage();
                message.setSpacename(this.name);
                message.setUser(spaceUser);
                watcher.write(message);
            });
        });
    }
    public removeWatcher(watcher: SpacesWatcher) {
        this.users.delete(watcher);
        debug(`Space ${this.name} : watched removed ${watcher.uuid}`);
    }

    private notifyWatchers(watcher: SpacesWatcher, message: SpaceMessage) {
        [...this.users.keys()].forEach((watcher_) => {
            if (watcher_ !== watcher) {
                watcher.write(message);
            }
        });
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
