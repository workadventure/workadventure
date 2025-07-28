import {
    SpaceUser,
    FilterType,
    AvailabilityStatus,
    UpdateSpaceUserMessage,
    SetPlayerDetailsMessage,
} from "@workadventure/messages";
import Debug from "debug";
import { merge } from "lodash";
import { applyFieldMask } from "protobuf-fieldmask";
import { Socket } from "../services/SocketManager";
import { clientEventsEmitter } from "../services/ClientEventsEmitter";
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
    name: string;
    handleWatch(watcher: Socket): void;
    handleUnwatch(watcher: Socket): void;
    isEmpty(): boolean;
    filterType: FilterType;
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
    sendLocalUsersToBack(): void;
    setSpaceStreamToBack(spaceStreamToBack: Promise<BackSpaceConnection>): void;
    handleConnectionRetryFailure(): void;
    getPropertiesToSync(): string[];
}

export class Space implements SpaceForSpaceConnectionInterface {
    public readonly users: Map<string, SpaceUserExtended>;

    public readonly metadata: Map<string, unknown>;

    // The list of users connected to THIS pusher specifically
    public readonly _localConnectedUser: Map<string, Socket>;
    public readonly _localWatchers: Set<string> = new Set<string>();
    public readonly _localConnectedUserWithSpaceUser = new Map<Socket, SpaceUserExtended>();
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
        private propertiesToSync: string[] = [],
        private SpaceToBackForwarderFactory: (space: Space) => SpaceToBackForwarderInterface = (space: Space) =>
            new SpaceToBackForwarder(space),
        private SpaceToFrontDispatcherFactory: (
            space: Space,
            eventProcessor: EventProcessor
        ) => SpaceToFrontDispatcherInterface = (space: Space, eventProcessor: EventProcessor) =>
            new SpaceToFrontDispatcher(space, eventProcessor),
        private _clientEventsEmitter = clientEventsEmitter
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
        const localUsers = Array.from(this._localConnectedUserWithSpaceUser.values()).map((spaceUser) => {
            return spaceUser;
        });
        this.forwarder.syncLocalUsersWithServer(localUsers);
    }

    public handleWatch(watcher: Socket) {
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
        console.log("👌👌👌👌👌👌👌 Space handleWatch addUserToNotify", spaceUser, this.name);
        this.forwarder.addUserToNotify(spaceUser);
        this._clientEventsEmitter.emitWatchSpace(this.name);

        this.users.forEach((user) => {
            this.dispatcher.notifyMeAddUser(watcher, user);
        });
    }

    public handleUnwatch(watcher: Socket) {
        const spaceUser = this._localConnectedUserWithSpaceUser.get(watcher);
        if (!spaceUser) {
            throw new Error("spaceUser not found");
        }
        this._localWatchers.delete(spaceUser.spaceUserId);
        this.forwarder.deleteUserFromNotify(spaceUser);
        this._clientEventsEmitter.emitUnwatchSpace(this.name);

        debug(`${this.name} : filter removed for ${watcher.getUserData().userId}`);
    }

    public isEmpty() {
        return this._localConnectedUserWithSpaceUser.size === 0;
    }

    /**
     * Cleans up the space when the space is deleted (only useful when the space is empty)
     */
    public cleanup(): void {
        this.forwarder.leaveSpace();
        this.spaceConnection.removeSpace(this);
        this._onSpaceEmpty(this);
    }

    /**
     * Called when the retry to connect to the back server fails in SpaceConnection.
     * This function should handle cleanup or notify the space that the connection cannot be established.
     */
    public handleConnectionRetryFailure() {
        this._onSpaceEmpty(this);
    }

    public setSpaceStreamToBack(spaceStreamToBack: Promise<BackSpaceConnection>) {
        this.spaceStreamToBackPromise = spaceStreamToBack;
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
        //TODO : see why search directly with client on localConnectedUserWithSpaceUser is not working
        const userUuid = client.getUserData().userUuid;
        const spaceUser = Array.from(this._localConnectedUserWithSpaceUser.values()).find(
            (user) => user.uuid === userUuid
        );
        if (!spaceUser) {
            console.error(
                "spaceUser not found",
                userUuid,
                client.getUserData().name,
                Array.from(this._localConnectedUserWithSpaceUser.values()).map((user) => user.name + " / " + user.uuid)
            );
            throw new Error(`spaceUser not found ${userUuid} / ${client.getUserData().name}`);
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
