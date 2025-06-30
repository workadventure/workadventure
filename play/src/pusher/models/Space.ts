import { SpaceUser, FilterType } from "@workadventure/messages";
import Debug from "debug";
import * as Sentry from "@sentry/node";
import { Socket } from "../services/SocketManager";
import { BackSpaceConnection } from "./Websocket/SocketData";
import { EventProcessor } from "./EventProcessor";
import { SpaceToBackForwarder, SpaceToBackForwarderInterface } from "./SpaceToBackForwarder";
import { SpaceToFrontDispatcher, SpaceToFrontDispatcherInterface } from "./SpaceToFrontDispatcher";
import { Query } from "./SpaceQuery";
import { SpaceConnectionInterface } from "./SpaceConnection";

export type SpaceUserExtended = {
    lowercaseName: string;
    // If the user is connected to this pusher, we store the socket to be able to contact the user directly.
    // Useful to forward public and private event that are dispatched even if the space is not watched.
    //client: Socket | undefined;
} & SpaceUser;

export type PartialSpaceUser = Partial<Omit<SpaceUser, "spaceUserId">> & Pick<SpaceUser, "spaceUserId">;
const debug = Debug("space");

/**
 * The Space class from the Pusher acts as a proxy and a cache for the users available in the space.
 * When a new user connects from the front, it is forwarded to the back. At the same ytime, we keep a reference to the user "socket".
 * The back is in charge of sending the complete list of users to the pusher and this list will be stored in the _users property.
 * By contrast, the _localConnectedUser contains only users connected to this pusher.
 *
 * When a user starts "watching" a space, we send the list of all users to the local user. Furthermore, we store the fact that the
 * local user is watching the space in the _localWatchers property.
 */

export interface SpaceInterface {
    forwarder: SpaceToBackForwarderInterface;
    dispatcher: SpaceToFrontDispatcherInterface;
    initSpace(): void;
    closeBackConnection(): void;
    name: string;
    handleWatch(watcher: Socket): void;
    handleUnwatch(watcher: Socket): void;
    isEmpty(): boolean;
    filterType: FilterType;
}

export interface SpaceForSpaceConnectionInterface extends SpaceInterface {
    sendLocalUsersToBack(): void;
    setSpaceStreamToBack(spaceStreamToBack: Promise<BackSpaceConnection>): void;
}

export class Space implements SpaceInterface {
    public readonly users: Map<string, SpaceUserExtended>;

    public readonly metadata: Map<string, unknown>;

    // The list of users connected to THIS pusher specifically
    public readonly _localConnectedUser: Map<string, Socket>;
    public readonly _localWatchers: Set<string> = new Set<string>();
    public spaceStreamToBackPromise: Promise<BackSpaceConnection> | undefined;
    public readonly forwarder: SpaceToBackForwarderInterface;
    public readonly dispatcher: SpaceToFrontDispatcherInterface;
    public readonly query: Query;

    constructor(
        public readonly name: string,
        // The local name is the name of the space in the browser (i.e. the name without the "world" prefix)
        public readonly localName: string,
        eventProcessor: EventProcessor,
        private _filterType: FilterType,
        private _onSpaceEmpty: (space: SpaceInterface) => void,
        private spaceConnection: SpaceConnectionInterface,
        private SpaceToBackForwarderFactory: (space: Space) => SpaceToBackForwarderInterface = (space: Space) =>
            new SpaceToBackForwarder(space),
        private SpaceToFrontDispatcherFactory: (
            space: Space,
            eventProcessor: EventProcessor
        ) => SpaceToFrontDispatcherInterface = (space: Space, eventProcessor: EventProcessor) =>
            new SpaceToFrontDispatcher(space, eventProcessor)
    ) {
        this.users = new Map<string, SpaceUserExtended>();
        this.metadata = new Map<string, unknown>();
        this._localConnectedUser = new Map<string, Socket>();
        this.forwarder = this.SpaceToBackForwarderFactory(this);
        this.dispatcher = this.SpaceToFrontDispatcherFactory(this, eventProcessor);
        this.query = new Query(this);
        debug(`created : ${name}`);
    }

    public initSpace() {
        this.spaceStreamToBackPromise = this.spaceConnection.getSpaceStreamToBackPromise(this);
    }

    sendLocalUsersToBack() {
        const localUsers = Array.from(this._localConnectedUser.values()).map((socket) => {
            return socket.getUserData().spaceUser;
        });
        this.forwarder.syncLocalUsersWithServer(localUsers);
    }

    public handleWatch(watcher: Socket) {
        debug(`${this.name} : filter added for ${watcher.getUserData().userId}`);

        const userData = watcher.getUserData();
        const spaceUserId = userData.spaceUser.spaceUserId;
        const userAlreadyWatchesThisSpace = this._localWatchers.has(spaceUserId);

        if (userAlreadyWatchesThisSpace) {
            console.warn(`${this.name} : filter already exists for ${watcher.getUserData().userId}`);
            return;
        }

        this._localWatchers.add(spaceUserId);

        this.users.forEach((user) => {
            this.dispatcher.notifyMeAddUser(watcher, user);
        });
    }

    public handleUnwatch(watcher: Socket) {
        const socketData = watcher.getUserData();
        const spaceUserId = socketData.spaceUser.spaceUserId;
        if (!spaceUserId) {
            throw new Error("spaceUserId not found");
        }
        this._localWatchers.delete(spaceUserId);

        debug(`${this.name} : filter removed for ${watcher.getUserData().userId}`);
    }

    public isEmpty() {
        return this._localConnectedUser.size === 0;
    }

    /**
     * Cleans up the space when the space is deleted (only useful when the space is empty)
     */
    public cleanup(): void {
        this.spaceConnection.removeSpace(this);
        this._onSpaceEmpty(this);
    }

    public closeBackConnection(): void {
        if (this.spaceStreamToBackPromise) {
            this.spaceStreamToBackPromise
                .then((spaceStreamToBack) => {
                    debug("closeBackConnection spaceStreamToBack", this.name);
                    spaceStreamToBack.end();
                    this.spaceStreamToBackPromise = undefined;
                })
                .catch((error) => {
                    console.error("Error while closing space back connection", error);
                    Sentry.captureException(error);
                });
        }
    }

    public setSpaceStreamToBack(spaceStreamToBack: Promise<BackSpaceConnection>) {
        this.spaceStreamToBackPromise = spaceStreamToBack;
    }

    get filterType(): FilterType {
        return this._filterType;
    }
}
