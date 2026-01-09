import type {
    BackToPusherSpaceMessage,
    NonUndefinedFields,
    PrivateEventBackToPusher,
    PublicEvent,
    SubMessage,
} from "@workadventure/messages";
import { noUndefined, SpaceUser, FilterType } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
//import { asError } from "catch-unknown";
import debug from "debug";
import { merge } from "lodash";
import { applyFieldMask } from "protobuf-fieldmask";
import { z } from "zod";
import { Deferred } from "ts-deferred";
import type { Socket } from "../services/SocketManager";
import type { EventProcessor } from "./EventProcessor";
import type { SpaceUserExtended, Space, PartialSpaceUser } from "./Space";

export interface SpaceToFrontDispatcherInterface {
    handleMessage(message: BackToPusherSpaceMessage): void;
    notifyMe(watcher: Socket, subMessage: SubMessage): void;
    notifyMeAddUser(watcher: Socket, user: SpaceUserExtended): void;
    notifyMeInit(watcher: Socket): Promise<void>;
    /**
     * Notify all watchers in this space. Notification is done only to watchers.
     */
    notifyAll(subMessage: SubMessage): void;
    /**
     * Notify everybody in this space, including non-watchers. Used to propagate the "disconnect" message.
     */
    notifyAllIncludingNonWatchers(subMessage: SubMessage): void;
}

export class SpaceToFrontDispatcher implements SpaceToFrontDispatcherInterface {
    private initDeferred = new Deferred<void>();

    constructor(private readonly _space: Space, private readonly eventProcessor: EventProcessor) {}
    handleMessage(message: BackToPusherSpaceMessage): void {
        if (!message.message) {
            console.warn("spaceStreamToBack => Empty message received.", message);
            return;
        }

        try {
            switch (message.message.$case) {
                case "initSpaceUsersMessage": {
                    const initSpaceUsersMessage = noUndefined(message.message.initSpaceUsersMessage);
                    this.initSpaceUsersMessage(initSpaceUsersMessage.users);
                    break;
                }
                case "addSpaceUserMessage": {
                    const addSpaceUserMessage = noUndefined(message.message.addSpaceUserMessage);
                    this.addUser(addSpaceUserMessage.user);
                    break;
                }
                case "updateSpaceUserMessage": {
                    const updateSpaceUserMessage = noUndefined(message.message.updateSpaceUserMessage);
                    try {
                        this.updateUser(updateSpaceUserMessage.user, updateSpaceUserMessage.updateMask);
                    } catch (err) {
                        console.warn("User not found, maybe left the space", err);
                    }
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
            console.error(error);
            Sentry.captureException(error);
        }
    }

    // This function is called when we received a message from the back (initialization of the user list)
    private initSpaceUsersMessage(spaceUsers: SpaceUser[]) {
        for (const spaceUser of spaceUsers) {
            if (this._space.users.has(spaceUser.spaceUserId)) {
                throw new Error(
                    `During init... user ${spaceUser.spaceUserId} already exists in space ${this._space.name}`
                );
            }
            const user: Partial<SpaceUserExtended> = spaceUser;
            user.lowercaseName = spaceUser.name.toLowerCase();

            this._space.users.set(spaceUser.spaceUserId, user as SpaceUserExtended);
            debug(`${this._space.name} : user added during init ${spaceUser.spaceUserId}.`);
        }
        debug(`${this._space.name} : init done. User count ${this._space.users.size}`);
        this.initDeferred.resolve();
    }

    // This function is called when we received a message from the back
    private addUser(spaceUser: SpaceUser) {
        if (this._space.users.has(spaceUser.spaceUserId)) {
            console.warn(`User ${spaceUser.spaceUserId} already exists in space ${this._space.name}`); // Probably already added
            return;
        }

        // Check if this is a local user - if so, reuse the existing object from _localConnectedUserWithSpaceUser
        // This ensures both maps point to the same object and updates are synchronized
        const localSocket = this._space._localConnectedUser.get(spaceUser.spaceUserId);
        let user: SpaceUserExtended;

        if (localSocket) {
            const existingLocalUser = this._space._localConnectedUserWithSpaceUser.get(localSocket);
            if (existingLocalUser) {
                // Reuse the existing local user object and merge any updates from the back
                merge(existingLocalUser, spaceUser);
                user = existingLocalUser;
            } else {
                // Shouldn't happen, but fallback to creating a new object
                user = { ...spaceUser, lowercaseName: spaceUser.name.toLowerCase() };
            }
        } else {
            // Remote user - create a new object
            user = { ...spaceUser, lowercaseName: spaceUser.name.toLowerCase() };
        }

        this._space.users.set(spaceUser.spaceUserId, user);
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

        // Track megaphoneState change for LIVE_STREAMING_USERS_WITH_FEEDBACK filtering
        const oldMegaphoneState = user.megaphoneState;
        const megaphoneStateChanged = updateMask.includes("megaphoneState") && spaceUser.megaphoneState !== undefined;
        const newMegaphoneState = megaphoneStateChanged ? spaceUser.megaphoneState ?? false : oldMegaphoneState;

        const updateValues = applyFieldMask(spaceUser, updateMask);

        merge(user, updateValues);

        if (spaceUser.name) user.lowercaseName = spaceUser.name.toLowerCase();
        debug(`${this._space.name} : user updated ${spaceUser.spaceUserId}`);

        // For LIVE_STREAMING_USERS_WITH_FEEDBACK, handle megaphoneState transitions for listeners
        if (this._space.filterType === FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK && megaphoneStateChanged) {
            this.handleMegaphoneStateChange(user, newMegaphoneState, updateMask);
            return;
        }

        const subMessage: SubMessage = {
            message: {
                $case: "updateSpaceUserMessage",
                updateSpaceUserMessage: {
                    spaceName: this._space.localName,
                    // Use the full user object (after merge) so filtering works correctly
                    // The user object has all fields including megaphoneState
                    user: this.toSpaceUser(user),
                    updateMask,
                },
            },
        };
        this.notifyAll(subMessage);
    }

    /**
     * Handles megaphoneState change for LIVE_STREAMING_USERS_WITH_FEEDBACK.
     * Speaker = megaphoneState true, Listener = megaphoneState false
     */
    private handleMegaphoneStateChange(user: SpaceUserExtended, newMegaphoneState: boolean, updateMask: string[]) {
        const userBecameSpeaker = newMegaphoneState;
        const isSelf = (watcherId: string) => watcherId === user.spaceUserId;

        this._space._localWatchers.forEach((watcherId) => {
            const watcher = this._space._localConnectedUser.get(watcherId);
            if (!watcher) {
                console.error(`Watcher ${watcherId} not found`);
                Sentry.captureException(`Watcher ${watcherId} not found`);
                return;
            }

            const observer = this._space._localConnectedUserWithSpaceUser.get(watcher);
            if (!observer) {
                console.error(`Observer not found for watcher ${watcherId}`);
                return;
            }

            if (userBecameSpeaker) {
                this.handleUserBecameSpeaker(watcher, observer, user, isSelf(watcherId));
            } else {
                this.handleUserBecameListener(watcher, observer, user, updateMask, isSelf(watcherId));
            }
        });
    }

    private handleUserBecameSpeaker(
        watcher: Socket,
        observer: SpaceUserExtended,
        user: SpaceUserExtended,
        isSelf: boolean
    ) {
        // Everyone sees the new speaker (add message)
        this.notifyMe(watcher, this.createAddUserMessage(user));

        // New speaker receives all visible users (speakers + all listeners since cameraFeedbackState is always true)
        if (isSelf) {
            for (const [spaceUserId, existingUser] of this._space.users.entries()) {
                if (spaceUserId === user.spaceUserId) continue;
                // cameraFeedbackState is always considered true, so speaker sees all users
                this.notifyMe(watcher, this.createAddUserMessage(existingUser));
            }
        }
    }

    private handleUserBecameListener(
        watcher: Socket,
        observer: SpaceUserExtended,
        user: SpaceUserExtended,
        updateMask: string[],
        isSelf: boolean
    ) {
        if (isSelf) {
            // New listener: remove all other listeners (can only see speakers now)
            // cameraFeedbackState is always considered true, so all listeners are removed
            for (const [spaceUserId, existingUser] of this._space.users.entries()) {
                if (spaceUserId === user.spaceUserId) continue;
                if (!existingUser.megaphoneState) {
                    this.notifyMe(watcher, this.createRemoveUserMessage(existingUser.spaceUserId));
                }
            }
        } else if (observer.megaphoneState) {
            // Speakers: always update (since cameraFeedbackState is always considered true)
            this.notifyMe(watcher, this.createUpdateUserMessage(user, updateMask));
        } else {
            // Listeners: stop seeing the user who became listener
            this.notifyMe(watcher, this.createRemoveUserMessage(user.spaceUserId));
        }
    }

    private createAddUserMessage(user: SpaceUserExtended): SubMessage {
        return {
            message: {
                $case: "addSpaceUserMessage",
                addSpaceUserMessage: {
                    spaceName: this._space.localName,
                    user: this.toSpaceUser(user),
                },
            },
        };
    }

    private createUpdateUserMessage(user: SpaceUserExtended, updateMask: string[]): SubMessage {
        return {
            message: {
                $case: "updateSpaceUserMessage",
                updateSpaceUserMessage: {
                    spaceName: this._space.localName,
                    user: this.toSpaceUser(user),
                    updateMask,
                },
            },
        };
    }

    private createRemoveUserMessage(spaceUserId: string): SubMessage {
        return {
            message: {
                $case: "removeSpaceUserMessage",
                removeSpaceUserMessage: {
                    spaceName: this._space.localName,
                    spaceUserId,
                },
            },
        };
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
            console.warn(`User not found in this space ${spaceUserId}`); // Probably already removed
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

    /**
     * Checks if an observer should see a specific user based on the filter type.
     * For LIVE_STREAMING_USERS_WITH_FEEDBACK:
     * - Speakers (megaphoneState=true) see everyone
     * - Listeners (megaphoneState=false) only see speakers
     */
    private shouldObserverSeeUser(observer: SpaceUserExtended, targetUser: SpaceUser): boolean {
        if (this._space.filterType !== FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK) {
            return true;
        }
        // Speakers see everyone
        if (observer.megaphoneState) {
            return true;
        }
        // Listeners only see speakers
        return targetUser.megaphoneState;
    }

    /**
     * Notify all watchers in this space. Notification is done only to watchers.
     * For LIVE_STREAMING_USERS_WITH_FEEDBACK, filters based on megaphoneState.
     */
    public notifyAll(subMessage: SubMessage) {
        this._space._localWatchers.forEach((watcherId) => {
            const watcher = this._space._localConnectedUser.get(watcherId);

            if (!watcher) {
                console.error(`Watcher ${watcherId} not found`);
                Sentry.captureException(`Watcher ${watcherId} not found`);
                return;
            }

            // For LIVE_STREAMING_USERS_WITH_FEEDBACK, filter based on observer's megaphoneState
            if (this._space.filterType === FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK) {
                const observer = this._space._localConnectedUserWithSpaceUser.get(watcher);
                if (!observer) {
                    console.error(`Observer not found for watcher ${watcherId}`);
                    return;
                }

                // Handle add/update/remove user messages with filtering
                if (subMessage.message?.$case === "addSpaceUserMessage") {
                    const targetUser = subMessage.message.addSpaceUserMessage.user;
                    if (targetUser && !this.shouldObserverSeeUser(observer, targetUser)) {
                        console.log(
                            `Skipping notification for watcher ${watcherId} because user ${targetUser.spaceUserId} is not visible to them`
                        );
                        return; // Skip this notification for this watcher
                    }
                } else if (subMessage.message?.$case === "updateSpaceUserMessage") {
                    const targetUser = subMessage.message.updateSpaceUserMessage.user;
                    if (targetUser && !this.shouldObserverSeeUser(observer, targetUser)) {
                        console.log(
                            `Skipping notification for watcher ${watcherId} because user ${targetUser.spaceUserId} is not visible to them`
                        );
                        return; // Skip this notification for this watcher
                    }
                } else if (subMessage.message?.$case === "removeSpaceUserMessage") {
                    // For remove messages, we need to check if the observer could see the user before
                    // Since the user is being removed, we check if the observer is a listener
                    // and the removed user was also a listener (they wouldn't have seen them anyway)
                    const removedUserId = subMessage.message.removeSpaceUserMessage.spaceUserId;
                    const removedUser = this._space.users.get(removedUserId);
                    if (removedUser && !this.shouldObserverSeeUser(observer, removedUser)) {
                        console.log(
                            `Skipping notification for watcher ${watcherId} because user ${removedUser.spaceUserId} is not visible to them`
                        );
                        return; // Skip this notification for this watcher
                    }
                }
            }

            this.notifyMe(watcher, subMessage);
        });
    }

    /**
     * Notify everybody in this space, including non-watchers. Used to propagate the "disconnect" message.
     */
    public notifyAllIncludingNonWatchers(subMessage: SubMessage) {
        this._space._localConnectedUser.forEach((socket) => {
            this.notifyMe(socket, subMessage);
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

    public async notifyMeInit(watcher: Socket) {
        await this.waitForInit();

        let users = Array.from(this._space.users.values());

        // For LIVE_STREAMING_USERS_WITH_FEEDBACK, filter users based on observer's megaphoneState
        if (this._space.filterType === FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK) {
            const observer = this._space._localConnectedUserWithSpaceUser.get(watcher);
            if (observer) {
                users = users.filter((user) => this.shouldObserverSeeUser(observer, user));
            }
        }

        const subMessage: SubMessage = {
            message: {
                $case: "initSpaceUsersMessage",
                initSpaceUsersMessage: {
                    spaceName: this._space.localName,
                    users,
                    metadata: JSON.stringify(Object.fromEntries(this._space.metadata)),
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

        const receiver = this._space._localConnectedUser.get(message.receiverUserId);

        if (!receiver) {
            console.warn(
                `Private message receiver ${message.receiverUserId} not found in space ${this._space.name}. Possibly disconnected or left the space.`
            );
            return;
        }

        const receiverSpaceUser = this._space._localConnectedUserWithSpaceUser.get(receiver);
        if (!receiverSpaceUser) {
            console.warn(
                `Private message receiver ${message.receiverUserId} not found in space ${this._space.name}. Possibly disconnected or left the space.`
            );
            return;
        }

        const receiverSocket = this._space._localConnectedUser.get(message.receiverUserId);

        if (!receiverSocket) {
            console.warn(`Private message receiver ${message.receiverUserId} not connected to this pusher`);
            return;
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

    private waitForInit(): Promise<void> {
        return this.initDeferred.promise;
    }

    /**
     * Converts a SpaceUserExtended to a SpaceUser by removing the extra properties.
     */
    private toSpaceUser(user: SpaceUserExtended): SpaceUser {
        // Destructure to remove lowercaseName and keep only SpaceUser properties
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { lowercaseName, ...spaceUser } = user;
        return SpaceUser.fromPartial(spaceUser);
    }
}
