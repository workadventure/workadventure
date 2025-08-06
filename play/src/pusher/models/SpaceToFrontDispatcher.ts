import {
    BackToPusherSpaceMessage,
    NonUndefinedFields,
    noUndefined,
    PrivateEventBackToPusher,
    PublicEvent,
    SpaceUser,
    SubMessage,
} from "@workadventure/messages";
import * as Sentry from "@sentry/node";
//import { asError } from "catch-unknown";
import debug from "debug";
import { merge } from "lodash";
import { applyFieldMask } from "protobuf-fieldmask";
import { z } from "zod";
import { Socket } from "../services/SocketManager";
import { EventProcessor } from "./EventProcessor";
import { SpaceUserExtended, Space, PartialSpaceUser } from "./Space";

export interface SpaceToFrontDispatcherInterface {
    handleMessage(message: BackToPusherSpaceMessage): void;
    notifyMe(watcher: Socket, subMessage: SubMessage): void;
    notifyMeAddUser(watcher: Socket, user: SpaceUserExtended): void;
    notifyAll(subMessage: SubMessage): void;
}

export class SpaceToFrontDispatcher implements SpaceToFrontDispatcherInterface {
    constructor(private readonly _space: Space, private readonly eventProcessor: EventProcessor) {}
    handleMessage(message: BackToPusherSpaceMessage): void {
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
                        Sentry.captureException(`Invalid metadata received. ${updateSpaceMetadataMessage.metadata}`);
                        console.error("Invalid metadata received.", updateSpaceMetadataMessage.metadata);
                        return;
                    }
                    this.updateMetadata(isMetadata.data);
                    break;
                }
                case "pingMessage": {
                    throw new Error(`${message.message.$case} should not be received by the dispatcher`);
                }
                case "kickOffMessage": {
                    debug("[space] kickOffSMessage received");
                    this._space.forwarder.forwardMessageToSpaceBack({
                        $case: "kickOffMessage",
                        kickOffMessage: {
                            userId: message.message.kickOffMessage.userId,
                            spaceName: message.message.kickOffMessage.spaceName,
                        },
                    });
                    break;
                }
                case "publicEvent": {
                    debug("[space] publicEvent received");
                    console.trace("[space] ❤️❤️❤️ publicEvent received", message.message.publicEvent);
                    this.sendPublicEvent(noUndefined(message.message.publicEvent));
                    break;
                }
                case "privateEvent": {
                    debug("[space] privateEvent received");
                    const privateEvent = message.message.privateEvent;
                    this.sendPrivateEvent(noUndefined(privateEvent));
                    break;
                }
                case "spaceAnswerMessage": {
                    if (message.message.spaceAnswerMessage.answer === undefined) {
                        console.error("Invalid message received. Answer missing.", message.message.spaceAnswerMessage);
                        throw new Error("Invalid message received. Answer missing.");
                    }
                    this._space.query.receiveAnswer(
                        message.message.spaceAnswerMessage.id,
                        message.message.spaceAnswerMessage.answer
                    );
                    break;
                }
                default: {
                    const _exhaustiveCheck: never = message.message;
                }
            }
        } catch (error) {
            // TODO : remove this when we have finished the migration to the new space system
            // this.notifyAllUsers(
            //     {
            //         message: {
            //             $case: "errorMessage",
            //             errorMessage: {
            //                 message: "An error occurred in pusher connection to back: " + asError(error).message,
            //             },
            //         },
            //     },
            //     "pusher"
            // );

            console.error(error);
            Sentry.captureException(error);
        }
    }

    // This function is called when we received a message from the back
    private addUser(spaceUser: SpaceUser) {
        const user: Partial<SpaceUserExtended> = spaceUser;
        user.lowercaseName = spaceUser.name.toLowerCase();

        if (this._space.users.has(spaceUser.spaceUserId)) {
            throw new Error(`User ${spaceUser.spaceUserId} already exists in space ${this._space.name}`);
        }
        this._space.users.set(spaceUser.spaceUserId, user as SpaceUserExtended);
        debug(`${this._space.name} : user added ${spaceUser.spaceUserId}. User count ${this._space.users.size}`);

        const subMessage: SubMessage = {
            message: {
                $case: "addSpaceUserMessage",
                addSpaceUserMessage: {
                    spaceName: this._space.localName,
                    user: spaceUser,
                },
            },
        };
        this.notifyAll(subMessage);
    }

    // This function is called when we received a message from the back
    private updateUser(spaceUser: PartialSpaceUser, updateMask: string[]) {
        const user = this._space.users.get(spaceUser.spaceUserId);
        if (!user) {
            throw new Error(`User not found in this space ${spaceUser.spaceUserId}`);
        }
        const updateValues = applyFieldMask(spaceUser, updateMask);

        merge(user, updateValues);

        if (spaceUser.name) user.lowercaseName = spaceUser.name.toLowerCase();
        debug(`${this._space.name} : user updated ${spaceUser.spaceUserId}`);
        const subMessage: SubMessage = {
            message: {
                $case: "updateSpaceUserMessage",
                updateSpaceUserMessage: {
                    spaceName: this._space.localName,
                    user: SpaceUser.fromPartial(spaceUser),
                    updateMask,
                },
            },
        };
        this.notifyAll(subMessage);
    }

    // This function is called when we received a message from the back
    private removeUser(spaceUserId: string) {
        const user = this._space.users.get(spaceUserId);
        if (user) {
            this._space.users.delete(spaceUserId);
            debug(`${this._space.name} : user removed ${spaceUserId}. User count ${this._space.users.size}`);

            const subMessage: SubMessage = {
                message: {
                    $case: "removeSpaceUserMessage",
                    removeSpaceUserMessage: {
                        spaceName: this._space.localName,
                        spaceUserId,
                    },
                },
            };

            this.notifyAll(subMessage);
        } else {
            throw new Error(`User not found in this space ${spaceUserId}`);
        }
    }

    private updateMetadata(metadata: { [key: string]: unknown }) {
        // Set all value of metadata in the space
        for (const [key, value] of Object.entries(metadata)) {
            this._space.metadata.set(key, value);
        }

        const subMessage: SubMessage = {
            message: {
                $case: "updateSpaceMetadataMessage",
                updateSpaceMetadataMessage: {
                    spaceName: this._space.localName,
                    metadata: JSON.stringify(metadata),
                },
            },
        };
        this.notifyAllMetadata(subMessage);
    }

    private notifyAllMetadata(subMessage: SubMessage) {
        this._space._localConnectedUser.forEach((watcher) => {
            const socketData = watcher.getUserData();
            if (subMessage.message?.$case === "updateSpaceMetadataMessage") {
                debug(`${this._space.name} : metadata update sent to ${socketData.name}`);
                subMessage.message.updateSpaceMetadataMessage.spaceName = this._space.localName;

                socketData.emitInBatch(subMessage);
            }
        });
    }

    public notifyAll(subMessage: SubMessage) {
        this._space._localWatchers.forEach((watcherId) => {
            const watcher = this._space._localConnectedUser.get(watcherId);

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

    public notifyMeAddUser(watcher: Socket, user: SpaceUserExtended) {
        const subMessage: SubMessage = {
            message: {
                $case: "addSpaceUserMessage",
                addSpaceUserMessage: {
                    spaceName: this._space.localName,
                    user,
                },
            },
        };
        this.notifyMe(watcher, subMessage);
    }

    private sendPublicEvent(message: NonUndefinedFields<PublicEvent>) {
        const spaceEvent = noUndefined(message.spaceEvent);

        // FIXME: this should be unnecessary because of the noUndefined call above
        // noUndefined does not seem to return an appropriate type
        if (!spaceEvent.event) {
            throw new Error("Event is required in spaceEvent");
        }

        const sender = this._space.users.get(message.senderUserId);

        if (!sender) {
            throw new Error(`Public message sender ${message.senderUserId} not found in space ${this._space.name}`);
        }

        this.notifyAllUsers(
            {
                message: {
                    $case: "publicEvent",
                    publicEvent: {
                        senderUserId: message.senderUserId,
                        spaceEvent: {
                            event: spaceEvent.event,
                        },
                        // The name of the space in the browser is the local name (i.e. the name without the "world" prefix)
                        spaceName: this._space.localName,
                    },
                },
            },
            message.senderUserId
        );
    }

    private sendPrivateEvent(message: NonUndefinedFields<PrivateEventBackToPusher>) {
        const spaceEvent = noUndefined(message.spaceEvent);

        // FIXME: this should be unnecessary because of the noUndefined call above
        // noUndefined does not seem to return an appropriate type
        if (!spaceEvent.event) {
            throw new Error("Event is required in spaceEvent");
        }

        //TODO : voir si on cherche dans les users ou dans tout les users connnectes plutot / meme chose pour les private event
        const receiver = this._space._localConnectedUser.get(message.receiverUserId);

        if (!receiver) {
            throw new Error(
                `Private message receiver ${message.receiverUserId} not found in space ${this._space.name}`
            );
        }

        const receiverSpaceUser = this._space._localConnectedUserWithSpaceUser.get(receiver);
        if (!receiverSpaceUser) {
            throw new Error(
                `Private message receiver ${message.receiverUserId} not found in space ${this._space.name}`
            );
        }

        const receiverSocket = this._space._localConnectedUser.get(message.receiverUserId);

        if (!receiverSocket) {
            throw new Error(`Private message receiver ${message.receiverUserId} not connected to this pusher`);
        }

        const extendedSender = {
            ...message.sender,
            lowercaseName: message.sender.name.toLowerCase(),
        };

        receiverSocket.getUserData().emitInBatch({
            message: {
                $case: "privateEvent",
                privateEvent: {
                    sender: extendedSender,
                    receiverUserId: message.receiverUserId,
                    spaceEvent: {
                        event: this.eventProcessor.processPrivateEvent(
                            spaceEvent.event,
                            extendedSender,
                            receiverSpaceUser
                        ),
                    },
                    // The name of the space in the browser is the local name (i.e. the name without the "world" prefix)
                    spaceName: this._space.localName,
                },
            },
        });
    }
    /**
     * Notify all users in this space expect the sender. Notification is done despite users watching or not.
     * It is used solely for public events.
     */
    private notifyAllUsers(subMessage: SubMessage, senderId: string) {
        for (const [socket, spaceUser] of this._space._localConnectedUserWithSpaceUser.entries()) {
            if (spaceUser.spaceUserId !== senderId) {
                socket.getUserData().emitInBatch(subMessage);
            }
        }
    }
}
