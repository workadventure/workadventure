import { CustomJsonReplacerInterface } from "./CustomJsonReplacerInterface";
import {
    AddSpaceUserMessage,
    PusherToBackSpaceMessage,
    RemoveSpaceUserMessage,
    SpaceUser,
    UpdateSpaceUserMessage,
} from "../../messages/generated/messages_pb";
import Debug from "debug";
import { BackSpaceConnection } from "./Websocket/ExSocketInterface";

const debug = Debug("space");

export class Space implements CustomJsonReplacerInterface {
    private users: Map<string, SpaceUser>;

    constructor(public readonly name: string, private spaceStreamToPusher: BackSpaceConnection, public backId: number) {
        this.users = new Map<string, SpaceUser>();
        debug(`Space created : ${name}`);
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
    }

    public updateUser(spaceUser: SpaceUser) {
        const updateSpaceUserMessage = new UpdateSpaceUserMessage();
        updateSpaceUserMessage.setSpacename(this.name);
        updateSpaceUserMessage.setUser(spaceUser);
        const pusherToBackSpaceMessage = new PusherToBackSpaceMessage();
        pusherToBackSpaceMessage.setUpdatespaceusermessage(updateSpaceUserMessage);
        this.spaceStreamToPusher.write(pusherToBackSpaceMessage);
        debug(`Space ${this.name} : space user update sent ${spaceUser.getUuid()}`);
        this.localUpdateUser(spaceUser);
    }
    public localUpdateUser(spaceUser: SpaceUser) {
        this.users.set(spaceUser.getUuid(), spaceUser);
        debug(`Space ${this.name} : space user updated ${spaceUser.getUuid()}`);
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
        this.users.delete(uuid);
        debug(`Space ${this.name} : space user removed ${uuid}`);
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
