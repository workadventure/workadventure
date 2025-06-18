import {
    NonUndefinedFields,
    noUndefined,
    PrivateEvent,
    PublicEvent,
    PusherToBackSpaceMessage,
    SpaceUser,
    SubMessage,
    FilterType,
} from "@workadventure/messages";
import { applyFieldMask } from "protobuf-fieldmask";
import merge from "lodash/merge";
import Debug from "debug";
import * as Sentry from "@sentry/node";
import { Socket } from "../services/SocketManager";
import { BackSpaceConnection } from "./Websocket/SocketData";
import { EventProcessor } from "./EventProcessor";

export type SpaceUserExtended = {
    lowercaseName: string;
    // If the user is connected to this pusher, we store the socket to be able to contact the user directly.
    // Useful to forward public and private event that are dispatched even if the space is not watched.
    client: Socket | undefined;
} & SpaceUser;

type PartialSpaceUser = Partial<Omit<SpaceUser, "spaceUserId">> & Pick<SpaceUser, "spaceUserId">;
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
export class Space {
    private readonly _users: Map<string, SpaceUserExtended>;

    private readonly _metadata: Map<string, unknown>;

    // The list of users connected to THIS pusher specifically
    private readonly _localConnectedUser: Map<string, Socket>;
    private readonly _localWatchers: Set<string> = new Set<string>();

    constructor(
        public readonly name: string,
        // The local name is the name of the space in the browser (i.e. the name without the "world" prefix)
        private readonly localName: string,
        private spaceStreamToBack: BackSpaceConnection,
        public backId: number,
        private eventProcessor: EventProcessor,
        private _filterType: FilterType
    ) {
        this._users = new Map<string, SpaceUserExtended>();
        this._metadata = new Map<string, unknown>();
        this._localConnectedUser = new Map<string, Socket>();
        debug(`created : ${name}`);
    }

    public registerUserAndForwardMessageToBack(spaceUser: SpaceUser, client: Socket) {
        const socketData = client.getUserData();
        if (!socketData.spaceUser.spaceUserId) {
            throw new Error("Space user id not found");
        }
        if (this._localConnectedUser.has(socketData.spaceUser.spaceUserId)) {
            throw new Error("Watcher already added for user " + socketData.spaceUser.spaceUserId);
        }
        this._localConnectedUser.set(socketData.spaceUser.spaceUserId, client);

        debug(`${this.name} : watcher added ${socketData.name}. Watcher count ${this._localConnectedUser.size}`);

        this.forwardMessageToSpaceBack({
            $case: "addSpaceUserMessage",
            addSpaceUserMessage: {
                spaceName: this.name,
                user: spaceUser,
            },
        });

        debug(`${this.name} : user add sent ${spaceUser.spaceUserId}`);

        if (this.metadata.size > 0) {
            // Notify the client of the space metadata
            const subMessage: SubMessage = {
                message: {
                    $case: "updateSpaceMetadataMessage",
                    updateSpaceMetadataMessage: {
                        spaceName: this.name,
                        metadata: JSON.stringify(Object.fromEntries(this.metadata.entries())),
                    },
                },
            };
            this.notifyMe(client, subMessage);
        }
    }

    // This function is called when we received a message from the back
    public addUser(spaceUser: SpaceUser, client: Socket | undefined) {
        const user: Partial<SpaceUserExtended> = spaceUser;
        user.lowercaseName = spaceUser.name.toLowerCase();
        user.client = client;

        if (this._users.has(spaceUser.spaceUserId)) {
            throw new Error(`User ${spaceUser.spaceUserId} already exists in space ${this.name}`);
        }
        this._users.set(spaceUser.spaceUserId, user as SpaceUserExtended);
        debug(`${this.name} : user added ${spaceUser.spaceUserId}. User count ${this._users.size}`);

        const subMessage: SubMessage = {
            message: {
                $case: "addSpaceUserMessage",
                addSpaceUserMessage: {
                    spaceName: this.localName,
                    user: spaceUser,
                },
            },
        };
        this.notifyAll(subMessage);
    }

    public forwardToBackUpdateMessage(spaceUser: PartialSpaceUser, updateMask: string[]) {
        this.forwardMessageToSpaceBack({
            $case: "updateSpaceUserMessage",
            updateSpaceUserMessage: {
                spaceName: this.name,
                user: SpaceUser.fromPartial(spaceUser),
                updateMask,
            },
        });
    }

    // This function is called when we received a message from the back
    public updateUser(spaceUser: PartialSpaceUser, updateMask: string[]) {
        const user = this._users.get(spaceUser.spaceUserId);
        if (!user) {
            console.error("User not found in this space", spaceUser);
            Sentry.captureException(new Error(`User not found in this space ${spaceUser.spaceUserId}`));
            return;
        }
        const updateValues = applyFieldMask(spaceUser, updateMask);

        merge(user, updateValues);

        if (spaceUser.name) user.lowercaseName = spaceUser.name.toLowerCase();
        debug(`${this.name} : user updated ${spaceUser.spaceUserId}`);
        const subMessage: SubMessage = {
            message: {
                $case: "updateSpaceUserMessage",
                updateSpaceUserMessage: {
                    spaceName: this.name,
                    user: SpaceUser.fromPartial(spaceUser),
                    updateMask,
                },
            },
        };
        this.notifyAll(subMessage);
    }

    public unregisterUserAndForwardToBack(watcher: Socket) {
        const userData = watcher.getUserData();

        const spaceUserId = userData.spaceUser.spaceUserId;
        if (!spaceUserId) {
            throw new Error("spaceUserId not found");
        }

        this._localConnectedUser.delete(spaceUserId);
        this._localWatchers.delete(spaceUserId);

        debug(`${this.name} : watcher removed ${userData.name}. Watcher count ${this._localConnectedUser.size}`);

        this.forwardMessageToSpaceBack({
            $case: "removeSpaceUserMessage",
            removeSpaceUserMessage: {
                spaceName: this.name,
                spaceUserId,
            },
        });

        debug(`${this.name} : user remove sent ${spaceUserId}`);
    }
    // This function is called when we received a message from the back
    public removeUser(spaceUserId: string) {
        const user = this._users.get(spaceUserId);
        if (user) {
            this._users.delete(spaceUserId);
            debug(`${this.name} : user removed ${spaceUserId}. User count ${this._users.size}`);

            const subMessage: SubMessage = {
                message: {
                    $case: "removeSpaceUserMessage",
                    removeSpaceUserMessage: {
                        spaceName: this.name,
                        spaceUserId,
                    },
                },
            };
            this.notifyAll(subMessage);
        } else {
            console.error(`Space => ${this.name} : user not found ${spaceUserId}`);
            Sentry.captureException(`Space => ${this.name} : user not found ${spaceUserId}`);
        }
    }

    public forwardUpdateMetadataToBack(metadata: { [key: string]: unknown }) {
        this.forwardMessageToSpaceBack({
            $case: "updateSpaceMetadataMessage",
            updateSpaceMetadataMessage: {
                spaceName: this.name,
                metadata: JSON.stringify(metadata),
            },
        });
    }

    public updateMetadata(metadata: { [key: string]: unknown }) {
        // Set all value of metadata in the space
        for (const [key, value] of Object.entries(metadata)) {
            this._metadata.set(key, value);
        }

        const subMessage: SubMessage = {
            message: {
                $case: "updateSpaceMetadataMessage",
                updateSpaceMetadataMessage: {
                    spaceName: this.name,
                    metadata: JSON.stringify(metadata),
                },
            },
        };
        this.notifyAllMetadata(subMessage);
    }

    private notifyAllMetadata(subMessage: SubMessage) {
        this._localConnectedUser.forEach((watcher) => {
            const socketData = watcher.getUserData();
            if (subMessage.message?.$case === "updateSpaceMetadataMessage") {
                debug(`${this.name} : metadata update sent to ${socketData.name}`);
                subMessage.message.updateSpaceMetadataMessage.spaceName = this.localName;

                socketData.emitInBatch(subMessage);
            }
        });
    }

    private notifyAll(subMessage: SubMessage) {
        this._localWatchers.forEach((watcherId) => {
            const watcher = this._localConnectedUser.get(watcherId);

            if (!watcher) {
                console.error(`Watcher ${watcherId} not found`);
                Sentry.captureException(`Watcher ${watcherId} not found`);
                return;
            }

            this.notifyMe(watcher, subMessage);
        });
    }

    public notifyMe(watcher: Socket, subMessage: SubMessage) {
        watcher.getUserData().emitInBatch(subMessage);
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

        this._users.forEach((user) => {
            this.notifyMeAddUser(watcher, user);
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

    private notifyMeAddUser(watcher: Socket, user: SpaceUserExtended) {
        const subMessage: SubMessage = {
            message: {
                $case: "addSpaceUserMessage",
                addSpaceUserMessage: {
                    spaceName: this.localName,
                    user,
                },
            },
        };
        this.notifyMe(watcher, subMessage);
    }

    /*private notifyMeUpdateUser(watcher: Socket, user: SpaceUserExtended, filterName: string | undefined) {
        const subMessage: SubMessage = {
            message: {
                $case: "updateSpaceUserMessage",
                updateSpaceUserMessage: {
                    spaceName: this.removeSpaceNamePrefix(this.name, watcher.getUserData().world),
                    user,
                    filterName,
                },
            },
        };
        this.notifyMe(watcher, subMessage);
    }*/

    public isEmpty() {
        return this._localConnectedUser.size === 0;
    }

    public sendPublicEvent(message: NonUndefinedFields<PublicEvent>) {
        const spaceEvent = noUndefined(message.spaceEvent);

        // FIXME: this should be unnecessary because of the noUndefined call above
        // noUndefined does not seem to return an appropriate type
        if (!spaceEvent.event) {
            throw new Error("Event is required in spaceEvent");
        }

        const sender = this._users.get(message.senderUserId);

        if (!sender) {
            throw new Error(`Public message sender ${message.senderUserId} not found in space ${this.name}`);
        }

        this.notifyAllUsers(
            {
                message: {
                    $case: "publicEvent",
                    publicEvent: {
                        senderUserId: message.senderUserId,
                        spaceEvent: {
                            event: this.eventProcessor.processPublicEvent(spaceEvent.event, sender),
                        },
                        // The name of the space in the browser is the local name (i.e. the name without the "world" prefix)
                        spaceName: this.localName,
                    },
                },
            },
            message.senderUserId
        );
    }

    public sendPrivateEvent(message: NonUndefinedFields<PrivateEvent>) {
        // [...this.clientWatchers.values()].forEach((watcher) => {
        //     const socketData = watcher.getUserData();
        //     if (socketData.userId === message.receiverUserId) {
        //         socketData.emitInBatch({
        //             message: {
        //                 $case: "privateEvent",
        //                 privateEvent: message,
        //             },
        //         });
        //     }
        // });
        const spaceEvent = noUndefined(message.spaceEvent);

        // FIXME: this should be unnecessary because of the noUndefined call above
        // noUndefined does not seem to return an appropriate type
        if (!spaceEvent.event) {
            throw new Error("Event is required in spaceEvent");
        }

        const receiver = this._users.get(message.receiverUserId);

        if (!receiver) {
            throw new Error(`Private message receiver ${message.receiverUserId} not found in space ${this.name}`);
        }

        const sender = this._users.get(message.senderUserId);

        if (!sender) {
            throw new Error(`Private message sender ${message.senderUserId} not found in space ${this.name}`);
        }

        receiver.client?.getUserData().emitInBatch({
            message: {
                $case: "privateEvent",
                privateEvent: {
                    senderUserId: message.senderUserId,
                    receiverUserId: message.receiverUserId,
                    spaceEvent: {
                        event: this.eventProcessor.processPrivateEvent(spaceEvent.event, sender, receiver),
                    },
                    // The name of the space in the browser is the local name (i.e. the name without the "world" prefix)
                    spaceName: this.localName,
                },
            },
        });
    }

    /**
     * Notify all users in this space expect the sender. Notification is done despite users watching or not.
     * It is used solely for public events.
     */
    private notifyAllUsers(subMessage: SubMessage, senderId: string) {
        /*this.clientWatchers.forEach((watcher) => {
            const socketData = watcher.getUserData();
            debug(`${this.name} : kickOff sent to ${socketData.name}`);
            socketData.emitInBatch(subMessage);
        });*/

        for (const user of this._users.values()) {
            if (user.client && user.spaceUserId !== senderId) {
                user.client.getUserData().emitInBatch(subMessage);
            }
        }
    }

    public forwardMessageToSpaceBack(pusherToBackSpaceMessage: PusherToBackSpaceMessage["message"]) {
        this.spaceStreamToBack.write({
            message: pusherToBackSpaceMessage,
        });
    }

    get metadata(): Map<string, unknown> {
        return this._metadata;
    }
    /**
     * Cleans up the space when the space is deleted (only useful when the connection to the back is closed or in timeout)
     */
    public cleanup(): void {
        // Send a message to all
        for (const [spaceUserId] of this._users.entries()) {
            const subMessage: SubMessage = {
                message: {
                    $case: "removeSpaceUserMessage",
                    removeSpaceUserMessage: {
                        spaceName: this.name,
                        spaceUserId,
                    },
                },
            };
            this.notifyAll(subMessage);
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

    get filterType(): FilterType {
        return this._filterType;
    }
}
