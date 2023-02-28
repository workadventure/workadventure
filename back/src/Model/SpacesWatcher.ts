import { SpaceSocket } from "../SpaceManager";
import {
    AddSpaceUserMessage,
    BackToPusherSpaceMessage,
    PingMessage,
    RemoveSpaceUserMessage,
    UpdateSpaceUserMessage,
} from "../Messages/generated/messages_pb";
import Debug from "debug";

export type SpaceMessage = AddSpaceUserMessage | UpdateSpaceUserMessage | RemoveSpaceUserMessage;

const debug = Debug("space");

/**
 * SpacesWatcher is a class that represent a watcher (socket: SpaceSocket) of spaces identified by his uuid.
 * He will be notified when a user joins or leaves one of his watched space. When a user, associated to one of his
 * watched space, updates his data.
 */
export class SpacesWatcher {
    private _spacesWatched: string[];
    private pingInterval: NodeJS.Timer | undefined;
    private pongTimeout: NodeJS.Timeout | undefined;
    public constructor(public readonly uuid: string, private readonly socket: SpaceSocket) {
        this._spacesWatched = [];
        // Send first ping and then send the second one
        this.sendPing();
        this.pingInterval = setInterval(() => this.sendPing(), 1000 * 30);
        debug("SpacesWatcher %s => created", this.uuid);
    }

    private sendPing() {
        this.receivedPong();
        const backToPusherSpaceMessage = new BackToPusherSpaceMessage();
        backToPusherSpaceMessage.setPingmessage(new PingMessage());
        this.socket.write(backToPusherSpaceMessage);
        this.pongTimeout = setTimeout(() => {
            debug("SpacesWatcher %s => killed => no ping received from Watcher", this.uuid);
            clearInterval(this.pingInterval);
            this.pingInterval = undefined;
            this.socket.end();
        }, 1000 * 20);
    }

    public receivedPong() {
        if (this.pongTimeout) {
            clearTimeout(this.pongTimeout);
            this.pongTimeout = undefined;
        }
    }

    public watchSpace(spaceName: string) {
        this._spacesWatched.push(spaceName);
        debug(`SpacesWatcher ${this.uuid} => watch ${spaceName}`);
    }

    public unwatchSpace(spaceName: string) {
        this._spacesWatched = this._spacesWatched.filter((space) => space !== spaceName);
        debug(`SpacesWatcher ${this.uuid} => unwatch ${spaceName}`);
    }

    get spacesWatched(): string[] {
        return this._spacesWatched;
    }

    public write(message: SpaceMessage) {
        const backToPusherSpaceMessage = new BackToPusherSpaceMessage();
        if (message instanceof AddSpaceUserMessage) {
            backToPusherSpaceMessage.setAddspaceusermessage(message);
        } else if (message instanceof UpdateSpaceUserMessage) {
            backToPusherSpaceMessage.setUpdatespaceusermessage(message);
        } else if (message instanceof RemoveSpaceUserMessage) {
            backToPusherSpaceMessage.setRemovespaceusermessage(message);
        } else {
            throw new Error("Can't send message to pusher");
        }
        this.socket.write(backToPusherSpaceMessage);
    }
}
