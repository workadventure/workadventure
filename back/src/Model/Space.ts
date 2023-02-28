import { CustomJsonReplacerInterface } from "./CustomJsonReplacerInterface";
import { SpacesWatcher, SpaceMessage } from "./SpacesWatcher";
import {
    AddSpaceUserMessage,
    PartialSpaceUser,
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
        debug(`${name} => created`);
    }

    public addUser(watcher: SpacesWatcher, spaceUser: SpaceUser) {
        const usersList = this.usersList(watcher);
        usersList.set(spaceUser.getUuid(), spaceUser);

        const message = new AddSpaceUserMessage();
        message.setSpacename(this.name);
        message.setUser(spaceUser);
        this.notifyWatchers(watcher, message);
        debug(`${this.name} : user => added ${spaceUser.getUuid()}`);
    }
    public updateUser(watcher: SpacesWatcher, spaceUser: PartialSpaceUser) {
        const usersList = this.usersList(watcher);
        const user = usersList.get(spaceUser.getUuid());
        if (user) {
            if (spaceUser.getTagsList().length > 0) {
                user.setTagsList(spaceUser.getTagsList());
            }
            if (spaceUser.hasName()) {
                user.setName(spaceUser.getName()?.getValue() as string);
            }
            if (spaceUser.hasPlayuri()) {
                user.setPlayuri(spaceUser.getPlayuri()?.getValue() as string);
            }
            if (spaceUser.hasColor()) {
                user.setColor(spaceUser.getColor()?.getValue() as string);
            }
            if (spaceUser.getCharacterlayersList().length > 0) {
                user.setCharacterlayersList(spaceUser.getCharacterlayersList());
            }
            if (spaceUser.hasIslogged()) {
                user.setIslogged(spaceUser.getIslogged()?.getValue() as boolean);
            }
            if (spaceUser.hasAvailabilitystatus()) {
                user.setAvailabilitystatus(spaceUser.getAvailabilitystatus()?.getValue() as number);
            }
            if (spaceUser.hasRoomname()) {
                user.setRoomname(spaceUser.getRoomname());
            }
            if (spaceUser.hasVisitcardurl()) {
                user.setVisitcardurl(spaceUser.getVisitcardurl());
            }
            if (spaceUser.hasScreensharing()) {
                user.setScreensharing(spaceUser.getScreensharing()?.getValue() as boolean);
            }
            if (spaceUser.hasAudiosharing()) {
                user.setAudiosharing(spaceUser.getAudiosharing()?.getValue() as boolean);
            }
            if (spaceUser.hasVideosharing()) {
                user.setVideosharing(spaceUser.getVideosharing()?.getValue() as boolean);
            }
            usersList.set(spaceUser.getUuid(), user);
            const message = new UpdateSpaceUserMessage();
            message.setSpacename(this.name);
            message.setUser(spaceUser);
            this.notifyWatchers(watcher, message);
            debug(`${this.name} : user => updated ${spaceUser.getUuid()}`);
        }
    }
    public removeUser(watcher: SpacesWatcher, uuid: string) {
        const usersList = this.usersList(watcher);
        usersList.delete(uuid);

        const message = new RemoveSpaceUserMessage();
        message.setSpacename(this.name);
        message.setUseruuid(uuid);
        this.notifyWatchers(watcher, message);
        debug(`${this.name} : user => removed ${uuid}`);
    }

    public addWatcher(watcher: SpacesWatcher) {
        this.users.set(watcher, new Map<string, SpaceUser>());
        debug(`Space ${this.name} => watcher added ${watcher.uuid}`);
        for (const spaceUsers of this.users.values()) {
            for (const spaceUser of spaceUsers.values()) {
                const message = new AddSpaceUserMessage();
                message.setSpacename(this.name);
                message.setUser(spaceUser);
                watcher.write(message);
            }
        }
    }
    public removeWatcher(watcher: SpacesWatcher) {
        this.users.delete(watcher);
        debug(`${this.name} => watcher removed ${watcher.uuid}`);
    }

    private notifyWatchers(watcher: SpacesWatcher, message: SpaceMessage) {
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
