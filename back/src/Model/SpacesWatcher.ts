import { SpaceSocket } from "../SpaceManager";
import {
    AddSpaceUserMessage,
    BackToPusherSpaceMessage,
    PingMessage,
    RemoveSpaceUserMessage,
    UpdateSpaceUserMessage,
} from "../Messages/generated/messages_pb";

export type SpaceMessage = AddSpaceUserMessage | UpdateSpaceUserMessage | RemoveSpaceUserMessage;

export class SpacesWatcher {
    private _spacesWatched: string[];
    private pingInterval: NodeJS.Timer | undefined;
    private pingTimeout: NodeJS.Timeout | undefined;
    public constructor(public readonly uuid: string, private readonly socket: SpaceSocket) {
        this._spacesWatched = [];
        this.pingInterval = setInterval(() => this.sendPing(), 1000 * 30);
    }

    private sendPing() {
        if (this.pingTimeout) {
            clearTimeout(this.pingTimeout);
            this.pingTimeout = undefined;
        }
        const backToPusherSpaceMessage = new BackToPusherSpaceMessage();
        backToPusherSpaceMessage.setPingmessage(new PingMessage());
        this.socket.write(backToPusherSpaceMessage);
        this.pingTimeout = setTimeout(() => this.socket.end(), 1000 * 20);
    }

    public receivedPong() {
        if (this.pingTimeout) {
            clearTimeout(this.pingTimeout);
            this.pingTimeout = undefined;
        }
    }

    public watchSpace(spaceName: string) {
        this._spacesWatched.push(spaceName);
    }

    public unwatchSpace(spaceName: string) {
        this._spacesWatched = this._spacesWatched.filter((space) => space !== spaceName);
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
