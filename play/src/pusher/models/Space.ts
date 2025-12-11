import * as Sentry from "@sentry/node";
import type { FilterType, UpdateSpaceUserMessage, SetPlayerDetailsMessage } from "@workadventure/messages";
import { SpaceUser, AvailabilityStatus } from "@workadventure/messages";
import Debug from "debug";
import { merge } from "lodash";
import { applyFieldMask } from "protobuf-fieldmask";
import type { Socket } from "../services/SocketManager";
import type { BackSpaceConnection } from "./Websocket/SocketData";
import type { EventProcessor } from "./EventProcessor";
import type { SpaceToBackForwarderInterface } from "./SpaceToBackForwarder";
import { SpaceToBackForwarder } from "./SpaceToBackForwarder";
import type { SpaceToFrontDispatcherInterface } from "./SpaceToFrontDispatcher";
import { SpaceToFrontDispatcher } from "./SpaceToFrontDispatcher";
import { Query } from "./SpaceQuery";
import type { SpaceConnectionInterface } from "./SpaceConnection";

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
    name: string;
    handleWatch(watcher: Socket): Promise<void>;
    handleUnwatch(watcher: Socket): void;
    isEmpty(): boolean;
    filterType: FilterType;
    world: string;
    applyAndGetUpdatedFieldsForUserFromSetPlayerDetails(
        client: Socket,
        playerDetailsMessage: SetPlayerDetailsMessage
    ): {
        changedFields: string[];
        partialSpaceUser: PartialSpaceUser;
    } | null;
    applyAndGetUpdatedFieldsForUserFromUpdateSpaceUserMessage(
        client: Socket,
        updateSpaceUserMessage: UpdateSpaceUserMessage
    ): {
        changedFields: string[];
        partialSpaceUser: PartialSpaceUser;
    } | null;
    cleanup(): void;
}

export interface SpaceForSpaceConnectionInterface extends SpaceInterface {
    setSpaceStreamToBack(spaceStreamToBack: Promise<BackSpaceConnection>): void;
    getPropertiesToSync(): string[];
}

export class Space implements SpaceForSpaceConnectionInterface {
    public readonly users: Map<string, SpaceUserExtended>;

    public readonly metadata: Map<string, unknown>;

    // The list of users connected to THIS pusher specifically.
    // Note: Space._localConnectedUser, Space._localConnectedUserWithSpaceUser and SocketData.spaces must be in sync.
    public readonly _localConnectedUser: Map<string, Socket>;
    public readonly _localConnectedUserWithSpaceUser = new Map<Socket, SpaceUserExtended>();
    public readonly _localWatchers: Set<string> = new Set<string>();
    public spaceStreamToBackPromise: Promise<BackSpaceConnection> | undefined;
    public readonly forwarder: SpaceToBackForwarderInterface;
    public readonly dispatcher: SpaceToFrontDispatcherInterface;
    public readonly query: Query;
    private destroyed = false;
    private cleanupAbortController = new AbortController();

    constructor(
        public readonly name: string,
        // The local name is the name of the space in the browser (i.e. the name without the "world" prefix)
        public readonly localName: string,
        eventProcessor: EventProcessor,
        private _filterType: FilterType,
        private _unregisterSpace: (space: SpaceInterface) => void,
        private spaceConnection: SpaceConnectionInterface,
        public readonly world: string,
        private propertiesToSync: string[] = [],
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
        this.setSpaceStreamToBack(this.spaceConnection.getSpaceStreamToBackPromise(this));
    }

    public async handleWatch(watcher: Socket) {
        debug(`${this.name} : filter added for ${watcher.getUserData().userId}`);

        const spaceUser = this._localConnectedUserWithSpaceUser.get(watcher);

        if (!spaceUser) {
            throw new Error("spaceUser not found");
        }

        const userAlreadyWatchesThisSpace = this._localWatchers.has(spaceUser.spaceUserId);

        if (userAlreadyWatchesThisSpace) {
            console.warn(`${this.name} : filter already exists for ${watcher.getUserData().userId}`);
            return;
        }

        this._localWatchers.add(spaceUser.spaceUserId);

        // Wait for the list of users to have been received from the back and then send all the users to the front
        await this.dispatcher.notifyMeInit(watcher);
        this.forwarder.addUserToNotify(spaceUser);
    }

    public handleUnwatch(watcher: Socket) {
        const spaceUser = this._localConnectedUserWithSpaceUser.get(watcher);
        if (!spaceUser) {
            throw new Error("spaceUser not found");
        }
        this._localWatchers.delete(spaceUser.spaceUserId);
        this.forwarder.deleteUserFromNotify(spaceUser);

        debug(`${this.name} : filter removed for ${watcher.getUserData().userId}`);
    }

    public isEmpty() {
        return this._localConnectedUserWithSpaceUser.size === 0;
    }

    /**
     * Cleans up the space when the space is deleted (only useful when the space is empty)
     */
    public cleanup(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;

        try {
            try {
                // We notify the listeners and the users that the space has suffered an unexpected disconnection
                // For normal cleanups, the list of people connected to the space is empty, so no one will receive this notification.
                // In case cleanup() is called because of a back disconnection, the message will tell the users that the space is no longer available.
                this.dispatcher.notifyAllIncludingNonWatchers({
                    message: {
                        $case: "spaceDestroyedMessage",
                        spaceDestroyedMessage: {
                            spaceName: this.localName,
                        },
                    },
                });
            } finally {
                try {
                    // Unregister the space from all local users (in case some users are still connected)
                    for (const socket of this._localConnectedUser.values()) {
                        const deleted = socket.getUserData().spaces.delete(this.name);
                        if (!deleted) {
                            console.warn(
                                `Space cleanup: space not found in socket spaces for ${this.name} / ${
                                    socket.getUserData().name
                                }`
                            );
                            Sentry.captureException(
                                new Error(
                                    `Space cleanup: space not found in socket spaces for ${this.name} / ${
                                        socket.getUserData().name
                                    }`
                                )
                            );
                        }
                        socket.getUserData().joinSpacesPromise.delete(this.name);
                    }
                } finally {
                    try {
                        this.forwarder.leaveSpace();
                    } finally {
                        try {
                            this.spaceConnection.removeSpace(this);
                        } finally {
                            try {
                                this.query.destroy();
                            } finally {
                                this.cleanupAbortController.abort();
                            }
                        }
                    }
                }
            }
        } finally {
            this._unregisterSpace(this);
        }

        this._localConnectedUser.clear();
        this._localConnectedUserWithSpaceUser.clear();
        this._localWatchers.clear();
    }

    public setSpaceStreamToBack(spaceStreamToBack: Promise<BackSpaceConnection>) {
        this.spaceStreamToBackPromise = spaceStreamToBack;
        this.spaceStreamToBackPromise
            .then((spaceStream) => {
                let connectionCutCalled = false;
                const onConnectionCut = () => {
                    console.log("Connection to back cut for space", this.name);
                    if (connectionCutCalled) {
                        return;
                    }
                    connectionCutCalled = true;
                    if (this.destroyed) {
                        return;
                    }
                    //this.query.destroy();

                    // Let's clean up the space and unregister it.
                    this.cleanup();
                };

                spaceStream.on("error", onConnectionCut);
                spaceStream.on("end", onConnectionCut);

                this.cleanupAbortController.signal.addEventListener(
                    "abort",
                    () => {
                        spaceStream.off("error", onConnectionCut);
                        spaceStream.off("end", onConnectionCut);
                    },
                    { once: true }
                );
            })
            .catch((err) => {
                console.error(`Failed to connect to space back for space ${this.name}:`, err);
                this.query.destroy();
            });
    }

    get filterType(): FilterType {
        return this._filterType;
    }

    public applyAndGetUpdatedFieldsForUserFromSetPlayerDetails(
        client: Socket,
        playerDetails: SetPlayerDetailsMessage
    ): {
        changedFields: string[];
        partialSpaceUser: PartialSpaceUser;
    } | null {
        const spaceUser = this._localConnectedUserWithSpaceUser.get(client);

        if (!spaceUser) {
            throw new Error(
                `spaceUser not found while trying to update player details: ${client.getUserData().spaceUserId} ${
                    client.getUserData().name
                }`
            );
        }

        const fieldMask: string[] = [];

        const oldStatus = spaceUser.availabilityStatus;
        const newStatus = playerDetails.availabilityStatus;

        if (newStatus !== oldStatus && newStatus !== AvailabilityStatus.UNCHANGED) {
            fieldMask.push("availabilityStatus");
            spaceUser.availabilityStatus = newStatus;
        }

        if (playerDetails.chatID !== spaceUser.chatID && playerDetails.chatID !== "") {
            fieldMask.push("chatID");
            spaceUser.chatID = playerDetails.chatID;
        }
        if (
            playerDetails.showVoiceIndicator !== undefined &&
            spaceUser.showVoiceIndicator !== playerDetails.showVoiceIndicator
        ) {
            fieldMask.push("showVoiceIndicator");
            spaceUser.showVoiceIndicator = playerDetails.showVoiceIndicator;
        }
        if (fieldMask.length > 0) {
            const partialSpaceUser: SpaceUser = SpaceUser.fromPartial({
                availabilityStatus: playerDetails.availabilityStatus,
                spaceUserId: spaceUser.spaceUserId,
                chatID: playerDetails.chatID,
                showVoiceIndicator: playerDetails.showVoiceIndicator,
            });

            return {
                changedFields: fieldMask,
                partialSpaceUser: partialSpaceUser,
            };
        }

        return null;
    }

    public applyAndGetUpdatedFieldsForUserFromUpdateSpaceUserMessage(
        client: Socket,
        updateSpaceUserMessage: UpdateSpaceUserMessage
    ): {
        changedFields: string[];
        partialSpaceUser: PartialSpaceUser;
    } | null {
        if (!updateSpaceUserMessage.updateMask || !updateSpaceUserMessage.user) {
            return null;
        }

        //TODO : see why search directly with client on localConnectedUserWithSpaceUser is not working
        const userUuid = client.getUserData().userUuid;
        const spaceUser = Array.from(this._localConnectedUserWithSpaceUser.values()).find(
            (user) => user.uuid === userUuid
        );
        if (!spaceUser) {
            throw new Error("spaceUser not found " + userUuid);
        }

        const updateValues = applyFieldMask(updateSpaceUserMessage.user, updateSpaceUserMessage.updateMask);

        merge(spaceUser, updateValues);

        return {
            changedFields: updateSpaceUserMessage.updateMask,
            partialSpaceUser: updateSpaceUserMessage.user,
        };
    }

    getPropertiesToSync(): string[] {
        return this.propertiesToSync;
    }
}
