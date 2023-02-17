import { CustomJsonReplacerInterface } from "./CustomJsonReplacerInterface";
import { Pusher, SpaceMessage } from "./Pusher";
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
    private users: Map<Pusher, Map<string, SpaceUser>>;

    constructor(name: string) {
        this.name = name;
        this.users = new Map<Pusher, Map<string, SpaceUser>>();
        debug(`Space created : ${name}`);
    }

    public addUser(pusher: Pusher, spaceUser: SpaceUser) {
        const usersList = this.usersList(pusher);
        usersList.set(spaceUser.getUuid(), spaceUser);

        const message = new AddSpaceUserMessage();
        message.setSpacename(this.name);
        message.setUser(spaceUser);
        this.notifyWatchers(message);
        debug(`Space ${this.name} : space user added ${spaceUser.getUuid()}`);
    }
    public updateUser(pusher: Pusher, spaceUser: SpaceUser) {
        const usersList = this.usersList(pusher);
        usersList.set(spaceUser.getUuid(), spaceUser);

        const message = new UpdateSpaceUserMessage();
        message.setSpacename(this.name);
        message.setUser(spaceUser);
        this.notifyWatchers(message);
        debug(`Space ${this.name} : space user updated ${spaceUser.getUuid()}`);
    }
    public removeUser(pusher: Pusher, uuid: string) {
        const usersList = this.usersList(pusher);
        usersList.delete(uuid);

        const message = new RemoveSpaceUserMessage();
        message.setSpacename(this.name);
        message.setUseruuid(uuid);
        this.notifyWatchers(message);
        debug(`Space ${this.name} : space user removed ${uuid}`);
    }

    public addWatcher(pusher: Pusher) {
        this.users.set(pusher, new Map<string, SpaceUser>());
        debug(`Space ${this.name} : watched added ${pusher.uuid}`);
    }
    public removeWatcher(pusher: Pusher) {
        this.users.delete(pusher);
        debug(`Space ${this.name} : watched removed ${pusher.uuid}`);
    }

    private notifyWatchers(message: SpaceMessage) {
        [...this.users.keys()].forEach((watcher) => {
            watcher.write(message);
        });
    }

    public canBeDeleted(): boolean {
        return this.users.size === 0;
    }

    private usersList(pusher: Pusher): Map<string, SpaceUser> {
        const usersList = this.users.get(pusher);
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
