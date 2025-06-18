import {
    NonUndefinedFields,
    noUndefined,
    PrivateEvent,
    PublicEvent,
    PusherToBackSpaceMessage,
    SpaceUser,
    SubMessage,
    FilterType,
    BackToPusherSpaceMessage,
} from "@workadventure/messages";
import { applyFieldMask } from "protobuf-fieldmask";
import merge from "lodash/merge";
import Debug from "debug";
import * as Sentry from "@sentry/node";
import { z } from "zod";
import { asError } from "catch-unknown";
import { Socket } from "../services/SocketManager";
import { apiClientRepository } from "../services/ApiClientRepository";
import { BackSpaceConnection } from "./Websocket/SocketData";
import { EventProcessor } from "./EventProcessor";

export type SpaceUserExtended = {
    lowercaseName: string;
    // If the user is connected to this pusher, we store the socket to be able to contact the user directly.
    // Useful to forward public and private event that are dispatched even if the space is not watched.
    //client: Socket | undefined;
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
    private spaceStreamToBackPromise: Promise<BackSpaceConnection> | undefined;
    public readonly backId: number;

    constructor(
        public readonly name: string,
        // The local name is the name of the space in the browser (i.e. the name without the "world" prefix)
        private readonly localName: string,
        private eventProcessor: EventProcessor,
        private _filterType: FilterType,
        private _apiClientRepository = apiClientRepository
    ) {
        this._users = new Map<string, SpaceUserExtended>();
        this._metadata = new Map<string, unknown>();
        this._localConnectedUser = new Map<string, Socket>();
        this.backId = this._apiClientRepository.getIndex(this.name);
        debug(`created : ${name}`);
    }

    public initSpace() {
        this.spaceStreamToBackPromise = (async () => {
            const apiSpaceClient = await this._apiClientRepository.getSpaceClient(this.name);
            const spaceStreamToBack = apiSpaceClient.watchSpace() as BackSpaceConnection;
            spaceStreamToBack
                .on("data", (message: BackToPusherSpaceMessage) => {
                    if (!message.message) {
                        console.warn("spaceStreamToBack => Empty message received.", message);
                        return;
                    }
                    try {
                        switch (message.message.$case) {
                            case "addSpaceUserMessage": {
                                const addSpaceUserMessage = noUndefined(message.message.addSpaceUserMessage);
                                this.addUser(addSpaceUserMessage.user);
                                break;
                            }
                            case "updateSpaceUserMessage": {
                                const updateSpaceUserMessage = noUndefined(message.message.updateSpaceUserMessage);
                                this.updateUser(updateSpaceUserMessage.user, updateSpaceUserMessage.updateMask);
                                break;
                            }
                            case "removeSpaceUserMessage": {
                                this.removeUser(message.message.removeSpaceUserMessage.spaceUserId);
                                break;
                            }
                            case "updateSpaceMetadataMessage": {
                                const updateSpaceMetadataMessage = message.message.updateSpaceMetadataMessage;

                                const isMetadata = z
                                    .record(z.string(), z.unknown())
                                    .safeParse(JSON.parse(updateSpaceMetadataMessage.metadata));
                                if (!isMetadata.success) {
                                    Sentry.captureException(
                                        `Invalid metadata received. ${updateSpaceMetadataMessage.metadata}`
                                    );
                                    console.error("Invalid metadata received.", updateSpaceMetadataMessage.metadata);
                                    return;
                                }
                                this.updateMetadata(isMetadata.data);
                                break;
                            }
                            case "pingMessage": {
                                if (spaceStreamToBack.pingTimeout) {
                                    clearTimeout(spaceStreamToBack.pingTimeout);
                                    spaceStreamToBack.pingTimeout = undefined;
                                }
                                const pusherToBackMessage: PusherToBackSpaceMessage = {
                                    message: {
                                        $case: "pongMessage",
                                        pongMessage: {},
                                    },
                                } as PusherToBackSpaceMessage;
                                spaceStreamToBack.write(pusherToBackMessage);

                                spaceStreamToBack.pingTimeout = setTimeout(() => {
                                    console.error("Error spaceStreamToBack timed out for back:", this.backId);
                                    Sentry.captureException(
                                        "Error spaceStreamToBack timed out for back: " + this.backId
                                    );
                                    spaceStreamToBack.end();
                                    this.spaceStreamToBackPromise = undefined;
                                    this.initSpace();
                                }, 1000 * 60);
                                break;
                            }
                            case "kickOffMessage": {
                                debug("[space] kickOffSMessage received");
                                this.forwardMessageToSpaceBack({
                                    $case: "kickOffMessage",
                                    kickOffMessage: {
                                        userId: message.message.kickOffMessage.userId,
                                        spaceName: message.message.kickOffMessage.spaceName,
                                        filterName: message.message.kickOffMessage.filterName,
                                    },
                                });
                                break;
                            }
                            case "publicEvent": {
                                debug("[space] publicEvent received");
                                this.sendPublicEvent(noUndefined(message.message.publicEvent));
                                break;
                            }
                            case "privateEvent": {
                                debug("[space] privateEvent received");
                                const privateEvent = message.message.privateEvent;
                                this.sendPrivateEvent(noUndefined(privateEvent));
                                break;
                            }
                            default: {
                                const _exhaustiveCheck: never = message.message;
                            }
                        }
                    } catch (error) {
                        this.notifyAllUsers(
                            {
                                message: {
                                    $case: "errorMessage",
                                    errorMessage: {
                                        message:
                                            "An error occurred in pusher connection to back: " + asError(error).message,
                                    },
                                },
                            },
                            "pusher"
                        );

                        console.error(error);
                        Sentry.captureException(error);
                    }
                })
                .on("end", () => {
                    debug("[space] spaceStreamsToBack ended");
                    if (spaceStreamToBack.pingTimeout) clearTimeout(spaceStreamToBack.pingTimeout);
                    //this.cleanup();
                    this.spaceStreamToBackPromise = undefined;
                    this.initSpace();
                })
                .on("error", (err: Error) => {
                    console.error(
                        "Error in connection to back server '" +
                            apiSpaceClient.getChannel().getTarget() +
                            "' for space '" +
                            this.name +
                            "':",
                        err
                    );
                    Sentry.captureException(err);
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
    public addUser(spaceUser: SpaceUser) {
        const user: Partial<SpaceUserExtended> = spaceUser;
        user.lowercaseName = spaceUser.name.toLowerCase();

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

        const receiverSocket = this._localConnectedUser.get(message.receiverUserId);

        if (!receiverSocket) {
            throw new Error(`Private message receiver ${message.receiverUserId} not connected to this pusher`);
        }

        receiverSocket.getUserData().emitInBatch({
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
        for (const user of this._localConnectedUser.values()) {
            const userData = user.getUserData();
            if (userData.spaceUser.spaceUserId !== senderId) {
                userData.emitInBatch(subMessage);
            }
        }
    }

    public forwardMessageToSpaceBack(pusherToBackSpaceMessage: PusherToBackSpaceMessage["message"]) {
        if (!this.spaceStreamToBackPromise) {
            throw new Error("Space stream to back not found");
        }

        this.spaceStreamToBackPromise
            .then((spaceStreamToBack) => {
                spaceStreamToBack.write({
                    message: pusherToBackSpaceMessage,
                });
            })
            .catch((error) => {
                console.error("Error while forwarding message to space back", error);
                Sentry.captureException(error);
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

    public closeBackConnection(): void {
        if (this.spaceStreamToBackPromise) {
            this.spaceStreamToBackPromise
                .then((spaceStreamToBack) => spaceStreamToBack.end())
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

/*
TODO : 
    - Séparation en 2 classes forwarder/Proxy et forwarder to front 
    - le space ne gere que la connexion au back 
    - test unitaire sur les 2 classes 
    - on peut faire un test unitaire sur l'event "end" en mockant la connexion le on devient juste une map ou on ajoute les callback bien on déclenche le callback + expect 
    - revoir le coté back et voir si on peut faire un test unitaire sur le back 
*/
