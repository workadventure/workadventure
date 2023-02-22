import { CustomJsonReplacerInterface } from "./CustomJsonReplacerInterface";
import {
    AddSpaceUserMessage,
    PartialSpaceUser,
    PusherToBackSpaceMessage,
    RemoveSpaceUserMessage,
    SpaceFilterContainName,
    SpaceUser,
    SubMessage,
    UpdateSpaceUserMessage,
} from "../../messages/generated/messages_pb";
import Debug from "debug";
import { BackSpaceConnection, ExSocketInterface } from "./Websocket/ExSocketInterface";

const debug = Debug("space");

type SpaceMessage = AddSpaceUserMessage | UpdateSpaceUserMessage | RemoveSpaceUserMessage;

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
        debug(`Space created : ${name}`);
    }

    public addClientWatcher(watcher: ExSocketInterface) {
        this.clientWatchers.set(watcher.userUuid, watcher);
    }

    public addUser(spaceUser: SpaceUser) {
        const addSpaceUserMessage = new AddSpaceUserMessage();
        addSpaceUserMessage.setSpacename(this.name);
        addSpaceUserMessage.setUser(spaceUser);
        const pusherToBackSpaceMessage = new PusherToBackSpaceMessage();
        pusherToBackSpaceMessage.setAddspaceusermessage(addSpaceUserMessage);
        this.spaceStreamToPusher.write(pusherToBackSpaceMessage);
        debug(`Space ${this.name} : space user add sent ${spaceUser.getUuid()}`);
        this.localAddUser(spaceUser);
    }
    public localAddUser(spaceUser: SpaceUser) {
        this.users.set(spaceUser.getUuid(), spaceUser);
        debug(`Space ${this.name} : space user added ${spaceUser.getUuid()}`);

        const addSpaceUserMessage = new AddSpaceUserMessage();
        addSpaceUserMessage.setSpacename(this.name);
        addSpaceUserMessage.setUser(spaceUser);
        this.notifyAll(addSpaceUserMessage);
    }

    public updateUser(spaceUser: PartialSpaceUser) {
        const updateSpaceUserMessage = new UpdateSpaceUserMessage();
        updateSpaceUserMessage.setSpacename(this.name);
        updateSpaceUserMessage.setUser(spaceUser);
        const pusherToBackSpaceMessage = new PusherToBackSpaceMessage();
        pusherToBackSpaceMessage.setUpdatespaceusermessage(updateSpaceUserMessage);
        this.spaceStreamToPusher.write(pusherToBackSpaceMessage);
        debug(`Space ${this.name} : space user update sent ${spaceUser.getUuid()}`);
        this.localUpdateUser(spaceUser);
    }
    public localUpdateUser(spaceUser: PartialSpaceUser) {
        const user = this.users.get(spaceUser.getUuid());
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
            this.users.set(spaceUser.getUuid(), user);
            debug(`Space ${this.name} : space user updated ${spaceUser.getUuid()}`);

            const updateSpaceUserMessage = new UpdateSpaceUserMessage();
            updateSpaceUserMessage.setSpacename(this.name);
            updateSpaceUserMessage.setUser(spaceUser);
            this.notifyAll(updateSpaceUserMessage);
        }
    }

    public removeUser(uuid: string) {
        const removeSpaceUserMessage = new RemoveSpaceUserMessage();
        removeSpaceUserMessage.setSpacename(this.name);
        removeSpaceUserMessage.setUseruuid(uuid);
        const pusherToBackSpaceMessage = new PusherToBackSpaceMessage();
        pusherToBackSpaceMessage.setRemovespaceusermessage(removeSpaceUserMessage);
        this.spaceStreamToPusher.write(pusherToBackSpaceMessage);
        debug(`Space ${this.name} : space user remove sent ${uuid}`);
        this.localRemoveUser(uuid);
    }
    public localRemoveUser(uuid: string) {
        const user = this.users.get(uuid);
        this.users.delete(uuid);
        debug(`Space ${this.name} : space user removed ${uuid}`);

        const removeSpaceUserMessage = new RemoveSpaceUserMessage();
        removeSpaceUserMessage.setUseruuid(uuid);
        removeSpaceUserMessage.setSpacename(this.name);

        this.notifyAll(removeSpaceUserMessage, user);
    }

    private notifyAll(spaceMessage: SpaceMessage, user: SpaceUser | undefined = undefined) {
        [...this.clientWatchers.values()]
            .filter((watcher) => this.isWatcherTargeted(watcher, spaceMessage, user))
            .forEach((watcher) => {
                const subMessage = new SubMessage();
                if (spaceMessage instanceof AddSpaceUserMessage) {
                    subMessage.setAddspaceusermessage(spaceMessage);
                } else if (spaceMessage instanceof UpdateSpaceUserMessage) {
                    subMessage.setUpdatespaceusermessage(spaceMessage);
                } else if (spaceMessage instanceof RemoveSpaceUserMessage) {
                    subMessage.setRemovespaceusermessage(spaceMessage);
                }
                watcher.emitInBatch(subMessage);
            });
    }

    private notifyMe(watcher: ExSocketInterface, spaceMessage: SpaceMessage, user: SpaceUser | undefined = undefined) {
        const subMessage = new SubMessage();
        if (spaceMessage instanceof AddSpaceUserMessage) {
            subMessage.setAddspaceusermessage(spaceMessage);
        } else if (spaceMessage instanceof UpdateSpaceUserMessage) {
            subMessage.setUpdatespaceusermessage(spaceMessage);
        } else if (spaceMessage instanceof RemoveSpaceUserMessage) {
            subMessage.setRemovespaceusermessage(spaceMessage);
        }
        watcher.emitInBatch(subMessage);
    }

    private isWatcherTargeted(
        watcher: ExSocketInterface,
        spaceMessage: SpaceMessage,
        user: SpaceUser | undefined = undefined
    ) {
        const filtersOfThisSpace = watcher.spacesFilters.filter(
            (spaceFilters) => spaceFilters.getSpacename() === this.name
        );
        return (
            filtersOfThisSpace.length === 0 ||
            filtersOfThisSpace.filter((spaceFilters) => {
                if (spaceFilters.hasSpacefiltercontainname()) {
                    const spaceFilterContainName = spaceFilters.getSpacefiltercontainname() as SpaceFilterContainName;
                    let name = "";
                    if (spaceMessage instanceof AddSpaceUserMessage || spaceMessage instanceof UpdateSpaceUserMessage) {
                        const user = this.users.get(spaceMessage.getUser()?.getUuid() as string);
                        name = user?.getName() as string;
                    } else {
                        name = user?.getName() as string;
                    }
                    if (name.includes(spaceFilterContainName.getValue())) {
                        return true;
                    }
                }
                return false;
            }).length > 0
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
