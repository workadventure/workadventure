import { SpaceUser, SubMessage, FilterType, BackToPusherSpaceMessage } from "@workadventure/messages";
import Debug from "debug";
import * as Sentry from "@sentry/node";
import { Socket } from "../services/SocketManager";
import { apiClientRepository } from "../services/ApiClientRepository";
import { BackSpaceConnection } from "./Websocket/SocketData";
import { EventProcessor } from "./EventProcessor";
import { SpaceToBackForwarder, SpaceToBackForwarderInterface } from "./SpaceToBackForwarder";
import { SpaceToFrontDispatcher, SpaceToFrontDispatcherInterface } from "./SpaceToFrontDispatcher";
import { Query } from "./SpaceQuery";

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
    backId: number;
    filterType: FilterType;
}

export class Space implements SpaceInterface {
    public readonly users: Map<string, SpaceUserExtended>;

    public readonly metadata: Map<string, unknown>;

    // The list of users connected to THIS pusher specifically
    public readonly _localConnectedUser: Map<string, Socket>;
    public readonly _localWatchers: Set<string> = new Set<string>();
    public spaceStreamToBackPromise: Promise<BackSpaceConnection> | undefined;
    public readonly backId: number;
    public readonly forwarder: SpaceToBackForwarderInterface;
    public readonly dispatcher: SpaceToFrontDispatcherInterface;
    public readonly query: Query;

    constructor(
        public readonly name: string,
        // The local name is the name of the space in the browser (i.e. the name without the "world" prefix)
        public readonly localName: string,
        eventProcessor: EventProcessor,
        private _filterType: FilterType,
        private _onBackEndDisconnect: (space: SpaceInterface) => void,
        private _apiClientRepository = apiClientRepository,
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
        this.backId = this._apiClientRepository.getIndex(this.name);
        this.forwarder = this.SpaceToBackForwarderFactory(this);
        this.dispatcher = this.SpaceToFrontDispatcherFactory(this, eventProcessor);
        this.query = new Query(this);
        debug(`created : ${name}`);
    }

    public initSpace() {
        this.spaceStreamToBackPromise = (async () => {
            const apiSpaceClient = await this._apiClientRepository.getSpaceClient(this.name);
            const spaceStreamToBack = apiSpaceClient.watchSpace() as BackSpaceConnection;
            spaceStreamToBack
                .on("data", (message: BackToPusherSpaceMessage) => {
                    try {
                        if (message.message) {
                            switch (message.message.$case) {
                                case "pingMessage":
                                    if (spaceStreamToBack.pingTimeout) {
                                        clearTimeout(spaceStreamToBack.pingTimeout);
                                        spaceStreamToBack.pingTimeout = undefined;
                                    }

                                    spaceStreamToBack.write({
                                        message: {
                                            $case: "pongMessage",
                                            pongMessage: {},
                                        },
                                    });

                                    spaceStreamToBack.pingTimeout = setTimeout(() => {
                                        console.error("Error spaceStreamToBack timed out for back:", this.backId);
                                        Sentry.captureException(
                                            "Error spaceStreamToBack timed out for back: " + this.backId
                                        );
                                        spaceStreamToBack.end();

                                        this.spaceStreamToBackPromise = undefined;
                                        //TODO : implement retry logic to wait for the back to be available again
                                        this.initSpace();
                                        this.sendLocalUsersToBack();
                                    }, 1000 * 60);

                                    return;
                                default:
                                    this.dispatcher.handleMessage(message);
                                    break;
                            }
                        } else {
                            this.dispatcher.handleMessage(message);
                        }
                    } catch (e) {
                        console.error("Error while handling message", e);
                        Sentry.captureException(e);
                    }
                })
                .on("end", () => {
                    debug("[space] spaceStreamsToBack ended");
                    if (spaceStreamToBack.pingTimeout) clearTimeout(spaceStreamToBack.pingTimeout);

                    this.spaceStreamToBackPromise = undefined;
                    this._onBackEndDisconnect(this);
                    this._localConnectedUser.clear();
                })
                .on("status", (status) => {
                    console.log("status : ", status);
                    //voir si on peut gerer la fin de la connexion ici
                })
                .on("error", (err: Error) => {
                    // On gère l'erreur comme un 'end' car la connexion au back est fermée.

                    console.error(
                        "Error in connection to back server '" +
                            apiSpaceClient.getChannel().getTarget() +
                            "' for space '" +
                            this.name +
                            "':",
                        err
                    );
                    Sentry.captureException(err);

                    this.initSpace();
                    this.sendLocalUsersToBack();
                });

            spaceStreamToBack.write({
                message: {
                    $case: "joinSpaceMessage",
                    joinSpaceMessage: {
                        spaceName: this.name,
                        filterType: this.filterType,
                    },
                },
            });

            return spaceStreamToBack;
        })();
    }

    private sendLocalUsersToBack() {
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
     * Cleans up the space when the space is deleted (only useful when the connection to the back is closed or in timeout)
     */
    public cleanup(): void {
        // Send a message to all
        for (const [spaceUserId] of this.users.entries()) {
            const subMessage: SubMessage = {
                message: {
                    $case: "removeSpaceUserMessage",
                    removeSpaceUserMessage: {
                        spaceName: this.name,
                        spaceUserId,
                    },
                },
            };
            this.dispatcher.notifyAll(subMessage);
        }
        // Let's remove any reference to the space in the watchers
        for (const watcher of this._localConnectedUser.values()) {
            const socketData = watcher.getUserData();
            const success = socketData.spaces.delete(this.name);
            if (!success) {
                console.error(`Impossible to remove space ${this.name} from the user's spaces. Space not found.`);
                Sentry.captureException(new Error(`Impossible to remove space ${this.name} from the user's spaces.`));
            }
        }

        // Finally, let's send a message to the front to warn that the space is deleted
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

    get filterType(): FilterType {
        return this._filterType;
    }
}
