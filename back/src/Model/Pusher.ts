import { SpaceSocket } from "../RoomManager";
import {
    AddSpaceUserMessage,
    BackToPusherSpaceMessage,
    RemoveSpaceUserMessage,
    UpdateSpaceUserMessage,
} from "../Messages/generated/messages_pb";

export type SpaceMessage = AddSpaceUserMessage | UpdateSpaceUserMessage | RemoveSpaceUserMessage;

export class Pusher {
    private _spacesWatched: string[];
    public constructor(public readonly uuid: string, private readonly socket: SpaceSocket) {
        this._spacesWatched = [];
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
