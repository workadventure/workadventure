import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";
import { TimeoutError } from "@workadventure/shared-utils/src/Abort/TimeoutError";
import { abortAny } from "@workadventure/shared-utils/src/Abort/AbortAny";
import { abortTimeout } from "@workadventure/shared-utils/src/Abort/AbortTimeout";
import type { Readable, Writable } from "svelte/store";
import { derived, get, readable, writable } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import { applyFieldMask } from "protobuf-fieldmask";
import type { Subscription } from "rxjs";
import { Observable, Subject } from "rxjs";
import { merge } from "lodash";
import { Deferred } from "ts-deferred";
import { MapStore } from "@workadventure/store-utils";
import type {
    PublicEvent,
    SpaceEvent,
    UpdateSpaceMetadataMessage,
    SpaceUser,
    PrivateSpaceEvent,
    PrivateEventPusherToFront,
} from "@workadventure/messages";
import { FilterType } from "@workadventure/messages";
import { raceAbort } from "@workadventure/shared-utils/src/Abort/raceAbort";
import z from "zod";
import { CharacterLayerManager } from "../Phaser/Entity/CharacterLayerManager";
import { RemotePeer } from "../WebRtc/RemotePeer";
import type { BlackListManager } from "../WebRtc/BlackListManager";
import { blackListManager } from "../WebRtc/BlackListManager";
import { ConnectionClosedError } from "../Connection/ConnectionClosedError";
import { highlightedEmbedScreen } from "../Stores/HighlightedEmbedScreenStore";
import type { Streamable } from "../Stores/StreamableCollectionStore";
import { LAST_VIDEO_BOX_PRIORITY } from "../Stores/StreamableCollectionStore";
import type {
    PrivateEventsObservables,
    PublicEventsObservables,
    SpaceInterface,
    SpaceUserUpdate,
    UpdateSpaceUserEvent,
    ReactiveSpaceUser,
    SpaceUserExtended,
} from "./SpaceInterface";
import { SpaceNameIsEmptyError } from "./Errors/SpaceError";
import type { RoomConnectionForSpacesInterface } from "./SpaceRegistry/SpaceRegistry";
import type { SimplePeerConnectionInterface } from "./SpacePeerManager/SpacePeerManager";
import { SpacePeerManager } from "./SpacePeerManager/SpacePeerManager";
import { lookupUserById } from "./Utils/UserLookup";

export interface VideoBox {
    uniqueId: string;
    spaceUser: SpaceUserExtended;
    streamable: Writable<Streamable | undefined>;
    // The lower the priority, the more important the streamable is.
    // -2: reserved for the local camera
    // -1: reserved for the local screen sharing
    // 0 - 1000: Videos started with scripting API
    // From 1000 - 2000: other screen sharing streams
    // 2000+: other streams
    priority: number;
    // The order in which the video boxes are displayed. Lower means more to the left/top.
    // The displayOrder is derived from the priority using the StableNSorter.
    displayOrder: Writable<number>;
    // Timestamp of the last time the streamable was speaking
    lastSpeakTimestamp?: number;
    //TODO : use this to set the style of the video box
    boxStyle?: { [key: string]: unknown };
    // If true, the video box is a megaphone space
    isMegaphoneSpace?: boolean;
}

export class Space implements SpaceInterface {
    private readonly name: string;

    private readonly publicEventsObservables: PublicEventsObservables = {};
    private readonly privateEventsObservables: PrivateEventsObservables = {};
    private _onLeaveSpace = new Subject<void>();
    public readonly onLeaveSpace = this._onLeaveSpace.asObservable();
    private _peerManager: SpacePeerManager;
    public allVideoStreamStore: MapStore<string, VideoBox> = new MapStore<string, VideoBox>();
    public allScreenShareStreamStore: MapStore<string, VideoBox> = new MapStore<string, VideoBox>();
    public readonly videoStreamStore: Readable<Map<string, VideoBox>>;
    public readonly screenShareStreamStore: Readable<Map<string, VideoBox>>;
    // private readonly blockedUsersVideoBox: Map<string, VideoBox> = new Map<string, VideoBox>();
    // private readonly blockedUsersScreenShareVideoBox: Map<string, VideoBox> = new Map<string, VideoBox>();
    private readonly _blockedUsersStore: Writable<Set<string>> = writable(new Set<string>());
    private readonly _blockedByUsersStore: Writable<Set<string>> = writable(new Set<string>());
    private readonly _allBlockedUsersStore: Readable<Set<string>> = derived(
        [this._blockedUsersStore, this._blockedByUsersStore],
        ([$blockedUsersStore, $blockedByUsersStore]) => {
            return new Set([...$blockedUsersStore, ...$blockedByUsersStore]);
        }
    );

    private _setUsers: ((value: Map<string, SpaceUserExtended>) => void) | undefined;
    private _users: Map<string, SpaceUserExtended> = new Map<string, SpaceUserExtended>();
    private _addUserSubject: Subject<SpaceUserExtended> = new Subject<SpaceUserExtended>();
    private _leftUserSubject: Subject<SpaceUserExtended> = new Subject<SpaceUserExtended>();
    private _updateUserSubject: Subject<UpdateSpaceUserEvent> = new Subject<UpdateSpaceUserEvent>();
    private _metadataSubject: Subject<Map<string, unknown>> = new Subject<Map<string, unknown>>();
    private _registerRefCount = 0;
    private isDestroyed = false;
    public readonly usersStore: Readable<Map<string, Readonly<SpaceUserExtended>>>;
    public readonly observeUserJoined: Observable<SpaceUserExtended>;
    public readonly observeUserLeft: Observable<SpaceUserExtended>;
    public readonly observeUserUpdated: Observable<UpdateSpaceUserEvent>;
    public readonly observeMetadata: Observable<Map<string, unknown>>;
    private readonly observeSyncUserAdded: Subscription;
    private readonly observeSyncUserUpdated: Subscription;
    private readonly observeSyncUserRemoved: Subscription;
    private observeVideoPeerAdded: Subscription | undefined;
    private observeScreenSharingPeerAdded: Subscription | undefined;

    // TODO: add a isStreamingStore to say that the current user is willing to stream in this space (independent of the actual camera/microphone state)
    private readonly _isStreamingStore: Writable<boolean>;
    private readonly observeSyncBlockUser: Subscription;
    private readonly observeSyncUnblockUser: Subscription;
    private readonly onBlockSubscribe: Subscription;
    private readonly onUnBlockSubscribe: Subscription;

    private _isDestroyed = false;
    private initPromise: Deferred<void> | undefined;

    /**
     * IMPORTANT: The only valid way to create a space is to use the SpaceRegistry.
     * Do not call this constructor directly.
     */
    private constructor(
        name: string,
        private _metadata = new Map<string, unknown>(),
        private _connection: RoomConnectionForSpacesInterface,
        public readonly filterType: FilterType,
        private _propertiesToSync: string[] = [],
        private _mySpaceUserId: SpaceUser["spaceUserId"],
        private _blackListManager: BlackListManager = blackListManager,
        private _highlightedEmbedScreenStore = highlightedEmbedScreen
    ) {
        if (name === "") {
            throw new SpaceNameIsEmptyError();
        }
        this.name = name;

        this.usersStore = readable(new Map<string, SpaceUserExtended>(), (set) => {
            this.registerSpaceFilter();
            this._setUsers = set;
            set(this._users);

            return () => {
                if (!this.isDestroyed) {
                    this.unregisterSpaceFilter();
                }
            };
        });

        this.observeUserJoined = new Observable<SpaceUserExtended>((subscriber) => {
            this.registerSpaceFilter();
            const sub = this._addUserSubject.subscribe(subscriber);

            return () => {
                sub.unsubscribe();
                if (!this.isDestroyed) {
                    this.unregisterSpaceFilter();
                }
            };
        });

        this.observeUserLeft = new Observable<SpaceUserExtended>((subscriber) => {
            this.registerSpaceFilter();
            const sub = this._leftUserSubject.subscribe(subscriber);

            return () => {
                sub.unsubscribe();
                if (!this.isDestroyed) {
                    this.unregisterSpaceFilter();
                }
            };
        });

        this.observeUserUpdated = new Observable<UpdateSpaceUserEvent>((subscriber) => {
            this.registerSpaceFilter();
            const sub = this._updateUserSubject.subscribe(subscriber);

            return () => {
                sub.unsubscribe();
                if (!this.isDestroyed) {
                    this.unregisterSpaceFilter();
                }
            };
        });

        this.observeMetadata = new Observable<Map<string, unknown>>((subscriber) => {
            this.registerSpaceFilter();
            const sub = this._metadataSubject.subscribe(subscriber);

            return () => {
                sub.unsubscribe();
                if (!this.isDestroyed) {
                    this.unregisterSpaceFilter();
                }
            };
        });

        this.videoStreamStore = derived(
            [this.allVideoStreamStore, this.usersStore],
            ([videoStreamStore, usersStore]) => {
                const newVideoStreamStore = new Map<string, VideoBox>();
                for (const [key, value] of videoStreamStore.entries()) {
                    if (usersStore.has(key)) {
                        newVideoStreamStore.set(key, value);
                    }
                }
                return newVideoStreamStore;
            }
        );
        this.screenShareStreamStore = derived(
            [this.allScreenShareStreamStore, this.usersStore],
            ([screenShareStreamStore, usersStore]) => {
                const newScreenShareStreamStore = new Map<string, VideoBox>();
                for (const [key, value] of screenShareStreamStore.entries()) {
                    if (usersStore.has(key)) {
                        newScreenShareStreamStore.set(key, value);
                    }
                }
                return newScreenShareStreamStore;
            }
        );

        this.onBlockSubscribe = this._blackListManager.onBlockStream.subscribe((userUuid) => {
            const spaceUser = this.getSpaceUserByUuid(userUuid);

            if (!spaceUser) {
                console.error("spaceUserId not found for userUuid", userUuid);
                return;
            }

            this.emitPrivateMessage(
                {
                    $case: "blockUserMessage",
                    blockUserMessage: {},
                },
                spaceUser.spaceUserId
            );

            this.blockUser(spaceUser.spaceUserId);
        });

        this.onUnBlockSubscribe = this._blackListManager.onUnBlockStream.subscribe((userUuid) => {
            const spaceUser = this.getSpaceUserByUuid(userUuid);

            if (!spaceUser) {
                console.error("spaceUserId not found for userUuid", userUuid);
                return;
            }

            this.emitPrivateMessage(
                {
                    $case: "unblockUserMessage",
                    unblockUserMessage: {},
                },
                spaceUser.spaceUserId
            );

            this.unblockUser(spaceUser.spaceUserId);
        });

        this._blockedUsersStore.set(this._blackListManager.getBlackListedUsers());

        this._peerManager = new SpacePeerManager(this, this._allBlockedUsersStore);
        this.registerPeerManagerEventHandlers();

        this.observeSyncUserAdded = this.observePrivateEvent("addSpaceUserMessage").subscribe((message) => {
            if (!message.addSpaceUserMessage.user) {
                console.error("addSpaceUserMessage is missing a user");
                return;
            }
            this.addUser(message.addSpaceUserMessage.user);
        });
        this.observeSyncUserUpdated = this.observePrivateEvent("updateSpaceUserMessage").subscribe((message) => {
            if (!message.updateSpaceUserMessage.user || !message.updateSpaceUserMessage.updateMask) {
                console.error("updateSpaceUserMessage is missing a user or an updateMask");
                return;
            }
            this.updateUserData(message.updateSpaceUserMessage.user, message.updateSpaceUserMessage.updateMask);
        });
        this.observeSyncUserRemoved = this.observePrivateEvent("removeSpaceUserMessage").subscribe((message) => {
            this.removeUser(message.removeSpaceUserMessage.spaceUserId);
        });

        this._isStreamingStore = writable(
            filterType === FilterType.ALL_USERS &&
                (this._propertiesToSync.includes("cameraState") ||
                    this._propertiesToSync.includes("microphoneState") ||
                    this._propertiesToSync.includes("screenSharingState"))
        );

        this.observeSyncBlockUser = this.observePrivateEvent("blockUserMessage").subscribe((message) => {
            this.blockByUser(message.sender.spaceUserId);
        });
        this.observeSyncUnblockUser = this.observePrivateEvent("unblockUserMessage").subscribe((message) => {
            this.unblockByUser(message.sender.spaceUserId);
        });
    }

    /**,
     * IMPORTANT: The only valid way to create a space is to use the SpaceRegistry.
     * Do not call this method directly.
     */
    static async create(
        name: string,
        filterType: FilterType,
        connection: RoomConnectionForSpacesInterface,
        propertiesToSync: string[] = [],
        signal: AbortSignal,
        options?: {
            metadata: Map<string, unknown>;
        }
    ): Promise<Space> {
        const spaceUserId = await connection.emitJoinSpace(name, filterType, propertiesToSync, {
            signal,
        });
        return new Space(
            name,
            options?.metadata ?? new Map<string, unknown>(),
            connection,
            filterType,
            propertiesToSync,
            spaceUserId
        );
    }

    getName(): string {
        return this.name;
    }
    getMetadata(): Map<string, unknown> {
        return this._metadata;
    }
    setMetadata(metadata: Map<string, unknown>): void {
        metadata.forEach((value, key) => {
            this._metadata.set(key, value);
        });
        if (this._metadataSubject) {
            this._metadataSubject.next(this._metadata);
        }
    }

    private async userLeaveSpace() {
        if (this._connection.closed) {
            // It is not uncommon to try to leave a space after the connection is closed.
            // In that case, we just skip sending the leaveSpace message to the server.
            return;
        }
        await this._connection.emitLeaveSpace(this.name);
    }

    public emitUpdateSpaceMetadata(metadata: Map<string, unknown>) {
        if (this._isDestroyed) {
            console.warn("Space is destroyed, skipping emitUpdateSpaceMetadata");
            return;
        }
        this._connection.emitUpdateSpaceMetadata(this.name, Object.fromEntries(metadata.entries()));
    }

    public observePublicEvent<K extends keyof PublicEventsObservables>(
        key: K
    ): NonNullable<PublicEventsObservables[K]> {
        const observable = this.publicEventsObservables[key];
        if (!observable) {
            return (this.publicEventsObservables[key] = new Subject() as NonNullable<PublicEventsObservables[K]>);
        }
        return observable;
    }
    public observePrivateEvent<K extends keyof PrivateEventsObservables>(
        key: K
    ): NonNullable<PrivateEventsObservables[K]> {
        const observable = this.privateEventsObservables[key];
        if (!observable) {
            return (this.privateEventsObservables[key] = new Subject() as NonNullable<PrivateEventsObservables[K]>);
        }
        return observable;
    }

    /**
     * Take a message received by the RoomConnection and dispatch it to the right observable.
     */
    public dispatchPublicMessage(message: PublicEvent) {
        const spaceEvent = message.spaceEvent;
        if (spaceEvent === undefined) {
            throw new Error("Received a message without spaceEvent");
        }
        const spaceInnerEvent = spaceEvent.event;
        if (spaceInnerEvent === undefined) {
            throw new Error("Received a message without event");
        }
        const sender = message.senderUserId;

        const subject = this.publicEventsObservables[spaceInnerEvent.$case];
        if (subject) {
            subject.next({
                //@ts-ignore We are hitting a limitation of TypeScript documented here: https://stackoverflow.com/questions/67513032/helper-function-to-un-discriminate-a-discriminated-union
                spaceName: message.spaceName,
                //@ts-ignore We are hitting a limitation of TypeScript documented here: https://stackoverflow.com/questions/67513032/helper-function-to-un-discriminate-a-discriminated-union
                sender,
                ...spaceInnerEvent,
            });
        }
    }

    /**
     * Take a message received by the RoomConnection and dispatch it to the right observable.
     */
    public dispatchPrivateMessage(message: PrivateEventPusherToFront) {
        const spaceEvent = message.spaceEvent;
        if (spaceEvent === undefined) {
            throw new Error("Received a message without spaceEvent");
        }
        const spaceInnerEvent = spaceEvent.event;
        if (spaceInnerEvent === undefined) {
            throw new Error("Received a message without event");
        }
        const sender = message.sender;
        if (sender === undefined) {
            throw new Error("Received a message without senderUserId");
        }
        const subject = this.privateEventsObservables[spaceInnerEvent.$case];
        if (subject) {
            subject.next({
                //@ts-ignore We are hitting a limitation of TypeScript documented here: https://stackoverflow.com/questions/67513032/helper-function-to-un-discriminate-a-discriminated-union
                spaceName: message.spaceName,
                //@ts-ignore We are hitting a limitation of TypeScript documented here: https://stackoverflow.com/questions/67513032/helper-function-to-un-discriminate-a-discriminated-union
                sender,
                ...spaceInnerEvent,
            });
        }
    }

    public emitPublicMessage(message: NonNullable<SpaceEvent["event"]>): void {
        if (this._isDestroyed) {
            console.warn("Space is destroyed, skipping emitPublicMessage");
            return;
        }
        this._connection.emitPublicSpaceEvent(this.name, message);
    }

    public emitPrivateMessage(message: NonNullable<PrivateSpaceEvent["event"]>, receiverUserId: string): void {
        this._connection.emitPrivateSpaceEvent(this.name, message, receiverUserId);
    }

    /**
     * Sends a message to the server to update our user in the space.
     */
    public emitUpdateUser(spaceUser: SpaceUserUpdate): void {
        if (this._isDestroyed) {
            console.warn("Space is destroyed, skipping emitUpdateUser");
            return;
        }
        this._connection.emitUpdateSpaceUserMessage(this.name, spaceUser);
    }

    /**
     * IMPORTANT: The only valid way to destroy a space is to use the SpaceRegistry.
     * Do not call this method directly.
     */
    async destroy() {
        this._isDestroyed = true;

        this.retryAbortController?.abort();
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
        }

        try {
            await this.userLeaveSpace();
        } catch (e) {
            if (e instanceof ConnectionClosedError) {
                // It is not uncommon to try to leave a space after the connection is closed.
                // In that case, we just skip logging the error.
            } else {
                console.error("Error while leaving space", e);
                Sentry.captureException(e);
            }
        }

        for (const subscription of Object.values(this.publicEventsObservables)) {
            subscription.complete();
        }
        for (const subscription of Object.values(this.privateEventsObservables)) {
            subscription.complete();
        }
        this._onLeaveSpace.next();
        this._onLeaveSpace.complete();
        this.observeSyncUserAdded.unsubscribe();
        this.observeSyncUserUpdated.unsubscribe();
        this.observeSyncUserRemoved.unsubscribe();
        this.observeVideoPeerAdded?.unsubscribe();
        this.observeScreenSharingPeerAdded?.unsubscribe();
        this.onBlockSubscribe.unsubscribe();
        this.onUnBlockSubscribe.unsubscribe();
        this.observeSyncBlockUser.unsubscribe();
        this.observeSyncUnblockUser.unsubscribe();

        this._peerManager.destroy();

        this.allVideoStreamStore.forEach((peer) => {
            const streamable = get(peer.streamable);
            if (streamable instanceof RemotePeer) {
                streamable.destroy();
            }
        });

        this.allScreenShareStreamStore.forEach((peer) => {
            const streamable = get(peer.streamable);
            if (streamable instanceof RemotePeer) {
                streamable.destroy();
            }
        });

        if (this._registerRefCount > 0) {
            this.unregisterSpaceFilter();
        }

        this.isDestroyed = true;
    }

    get simplePeer(): SimplePeerConnectionInterface | undefined {
        return this._peerManager.getPeer();
    }

    get spacePeerManager(): SpacePeerManager {
        return this._peerManager;
    }

    /**
     * @returns an observable that emits the new metadata of the space when it changes.
     */
    watchSpaceMetadata(): Observable<UpdateSpaceMetadataMessage> {
        return this._connection.updateSpaceMetadataMessageStream;
    }

    //FROM SPACE FILTER

    initUsers(users: SpaceUser[]): void {
        for (const user of users) {
            const extendSpaceUser = this.extendSpaceUser(user);
            if (!this._users.has(user.spaceUserId)) {
                if (this.isVideoSpace() && user.spaceUserId !== this._mySpaceUserId) {
                    const videoBox = this.getEmptyVideoBox(extendSpaceUser);
                    const streamable = this.spacePeerManager.getVideoForUser(user.spaceUserId);
                    if (streamable) {
                        videoBox.streamable.set(streamable);
                    }
                    this.allVideoStreamStore.set(user.spaceUserId, videoBox);

                    if (this._blackListManager.isBlackListed(user.spaceUserId)) {
                        this.emitPrivateMessage(
                            {
                                $case: "blockUserMessage",
                                blockUserMessage: {},
                            },
                            user.spaceUserId
                        );
                    }

                    if (user.screenSharingState) {
                        const videoBox = this.getEmptyVideoBox(extendSpaceUser, true);
                        const streamable = this.spacePeerManager.getScreenSharingForUser(user.spaceUserId);
                        if (streamable) {
                            videoBox.streamable.set(streamable);
                        }
                        this.allScreenShareStreamStore.set(user.spaceUserId, videoBox);
                    }
                }

                this._users.set(user.spaceUserId, extendSpaceUser);
                if (this._addUserSubject) {
                    this._addUserSubject.next(extendSpaceUser);
                }
            }
        }

        this._setUsers?.(this._users);
        this.initPromise?.resolve();
    }

    addUser(user: SpaceUser): SpaceUserExtended {
        const extendSpaceUser = this.extendSpaceUser(user);

        if (!this._users.has(user.spaceUserId)) {
            if (this.isVideoSpace() && user.spaceUserId !== this._mySpaceUserId) {
                const streamable = this.spacePeerManager.getVideoForUser(user.spaceUserId);
                const videoBox = this.getEmptyVideoBox(extendSpaceUser);

                if (streamable) {
                    videoBox.streamable.set(streamable);
                }
                this.allVideoStreamStore.set(user.spaceUserId, videoBox);

                if (this._blackListManager.isBlackListed(user.spaceUserId)) {
                    this.emitPrivateMessage(
                        {
                            $case: "blockUserMessage",
                            blockUserMessage: {},
                        },
                        user.spaceUserId
                    );
                }
            }
            this._users.set(user.spaceUserId, extendSpaceUser);
            if (this._setUsers) {
                this._setUsers(this._users);
            }

            if (this._addUserSubject) {
                this._addUserSubject.next(extendSpaceUser);
            }
        }

        return extendSpaceUser;
    }

    removeUser(spaceUserId: string): void {
        const user = this._users.get(spaceUserId);
        if (user) {
            this._users.delete(spaceUserId);
            if (this._setUsers) {
                this._setUsers(this._users);
            }
            if (this._leftUserSubject) {
                this._leftUserSubject.next(user);
            }

            this.allVideoStreamStore.delete(spaceUserId);
            this.allScreenShareStreamStore.delete(spaceUserId);
        }
    }

    updateUserData(newData: SpaceUser, updateMask: string[]): void {
        if (!newData.spaceUserId && newData.spaceUserId !== "") return;

        const userToUpdate = this._users.get(newData.spaceUserId);

        if (!userToUpdate) return;

        // For some reason, the WithFieldMask type seems to apply recursively on array. I think it is a bug in our context.
        const maskedNewData = applyFieldMask(newData, updateMask) as unknown as Partial<SpaceUser>;

        merge(userToUpdate, maskedNewData);

        for (const key in maskedNewData) {
            // We allow ourselves a not 100% exact type cast here.
            // Technically, newData could contain any key, not only keys part of SpaceUser type (because additional keys
            // are allowed in Javascript objects)
            // However, we know for sure that the keys of newData are part of SpaceUser type, so we can safely cast them.
            const castKey = key as keyof typeof newData;
            // Out of security, we add a runtime check to ensure that the key is part of SpaceUser type
            if (castKey in userToUpdate.reactiveUser) {
                // Finally, we cast the "Readable" to "Writable" to be able to update the value. We know for sure it is
                // writable because the only place that can create a "ReactiveSpaceUser" is the "extendSpaceUser" method.
                const store = userToUpdate.reactiveUser[castKey];
                if (typeof store === "object" && "set" in store) {
                    (store as Writable<unknown>).set(newData[castKey]);
                }
            }
        }

        if (this._updateUserSubject) {
            this._updateUserSubject.next({
                newUser: userToUpdate,
                changes: maskedNewData,
                updateMask: updateMask,
            });
        }

        if (maskedNewData.screenSharingState !== undefined && userToUpdate.spaceUserId !== this._mySpaceUserId) {
            if (maskedNewData.screenSharingState) {
                const videoBox = this.getEmptyVideoBox(userToUpdate, true);
                const streamable = this._peerManager.getScreenSharingForUser(userToUpdate.spaceUserId);
                if (streamable) {
                    videoBox.streamable.set(streamable);
                }

                this.allScreenShareStreamStore.set(userToUpdate.spaceUserId, videoBox);
                this._highlightedEmbedScreenStore.toggleHighlight(videoBox);
            } else {
                this.allScreenShareStreamStore.delete(userToUpdate.spaceUserId);
            }
        }
        /*if (this._setUsers) {
            this._setUsers(this._users);
        }*/
    }

    private extendSpaceUser(user: SpaceUser): SpaceUserExtended {
        const extendedUser = {
            ...user,
            pictureStore: readable<string | undefined>(undefined, (set) => {
                CharacterLayerManager.wokaBase64(user.characterTextures)
                    .then((wokaBase64) => {
                        set(wokaBase64);
                    })
                    .catch((e) => {
                        Sentry.captureException(e);
                        console.warn("Error while getting woka base64", e);
                    });
            }),

            //emitter,
            emitPrivateEvent: (message: NonNullable<PrivateSpaceEvent["event"]>) => {
                if (this._isDestroyed) {
                    console.warn("Space is destroyed, skipping emitPrivateEvent");
                    return;
                }
                this._connection.emitPrivateSpaceEvent(this.getName(), message, user.spaceUserId);
            },
            space: this,
            // reactiveUser will be initialized just after the object creation
            reactiveUser: undefined as unknown as ReactiveSpaceUser,
        } as SpaceUserExtended;

        extendedUser.reactiveUser = new Proxy(
            {
                spaceUserId: extendedUser.spaceUserId,
                roomName: extendedUser.roomName,
                playUri: extendedUser.playUri,
            } as unknown as ReactiveSpaceUser,
            {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                get(target: any, property: PropertyKey, receiver: unknown) {
                    if (typeof property !== "string") {
                        return Reflect.get(target, property, receiver);
                    }

                    if (target[property as keyof ReactiveSpaceUser]) {
                        return target[property as keyof ReactiveSpaceUser];
                    } else {
                        if (property in extendedUser) {
                            //@ts-ignore We check just above that the property is in extendedUser
                            target[property] = writable(extendedUser[property]);
                            return target[property];
                        } else {
                            return Reflect.get(target, property, receiver);
                        }
                    }
                },
            }
        );

        return extendedUser;
    }

    private unregisterSpaceFilter() {
        if (this._isDestroyed) {
            console.warn("Space is destroyed, skipping unregisterSpaceFilter");
            return;
        }
        this._registerRefCount--;
        if (this._registerRefCount === 0) {
            this._connection.emitRemoveSpaceFilter({
                spaceFilterMessage: {
                    spaceName: this.getName(),
                },
            });
            if (this.initPromise) {
                // Reject the pending init promise to cancel any awaiting getUsers()
                // Attach a no-op catch to avoid unhandled rejection errors in tests/runtime.
                this.initPromise.promise.catch(() => {});
                this.initPromise.reject();
                this.initPromise = undefined;
            }
        }
    }

    private registerSpaceFilter() {
        if (this._isDestroyed) {
            console.warn("Space is destroyed, skipping registerSpaceFilter");
            return;
        }
        if (this._registerRefCount === 0) {
            this._connection.emitAddSpaceFilter({
                spaceFilterMessage: {
                    spaceName: this.getName(),
                },
            });
            if (this.initPromise) {
                // Cancel previous init promise if a new registration starts
                this.initPromise.promise.catch(() => {});
                this.initPromise.reject();
            }
            this.initPromise = new Deferred<void>();
            // Ensure rejections are handled to prevent unhandled rejection warnings/errors
            this.initPromise.promise.catch(() => {});
        }
        this._registerRefCount++;
    }

    public getSpaceUserBySpaceUserId(id: string): SpaceUserExtended | undefined {
        return this._users.get(id);
    }

    public getSpaceUserByUuid(uuid: string): SpaceUserExtended | undefined {
        return Array.from(this._users.values())
            .filter((user) => {
                return this.mySpaceUserId !== user.spaceUserId;
            })
            .find((user) => user.uuid === uuid);
    }

    public getSpaceUserByUserId(id: number): SpaceUserExtended | undefined {
        return lookupUserById(id, this);
    }

    public getScreenSharingPeerVideoBox(id: SpaceUser["spaceUserId"]): VideoBox | undefined {
        return this.allScreenShareStreamStore.get(id);
    }
    public getVideoPeerVideoBox(id: SpaceUser["spaceUserId"]): VideoBox | undefined {
        const videoBox = this.allVideoStreamStore.get(id);
        if (!videoBox) {
            console.error(">>>>> getVideoPeerVideoBox => Video box not found for user", id);
            return undefined;
        }
        return videoBox;
    }

    public async dispatchSound(url: URL): Promise<void> {
        await this.spacePeerManager.dispatchSound(url);
    }

    public getPropertiesToSync(): string[] {
        return this._propertiesToSync;
    }

    public get mySpaceUserId(): SpaceUser["spaceUserId"] {
        return this._mySpaceUserId;
    }

    /**
     * Returns a promise that resolves to the current list of users in the space.
     * The promise will only resolve once the initial list of users has been received from the server.
     * After that, the promise will resolve immediately with the current list of users.
     * Important! This method will register a space watcher on the connection if one is not already registered.
     * If no other method is called to hold this watcher, it will be unregistered on the next tick of the event loop.
     * Calling getUsers() multiple times would query the full user list multiple times, which is not efficient.
     * Use observeUserJoined, observeUserLeft and observeUserUpdated to be notified of user changes or the usersStore.
     */
    public async getUsers(options?: { signal: AbortSignal }): Promise<Map<string, Readonly<SpaceUserExtended>>> {
        this.registerSpaceFilter();

        setTimeout(() => {
            // Let's unregister, but later, to let potential subscribers register just after getUsers() returned.
            if (!this.isDestroyed) {
                this.unregisterSpaceFilter();
            }
        }, 0);

        if (!this.initPromise) {
            throw new Error("initPromise is not defined");
        }

        await raceAbort(this.initPromise.promise, options?.signal);

        return this._users;
    }

    public isVideoSpace(): boolean {
        return this._propertiesToSync.some((prop) =>
            ["cameraState", "microphoneState", "screenSharingState"].includes(prop)
        );
    }

    private getEmptyVideoBox(user: SpaceUserExtended, isScreenSharing: boolean = false): VideoBox {
        // Use zod to parse the metadata
        const metadata = z
            .object({
                isMegaphoneSpace: z.boolean().default(false),
            })
            .parse(Object.fromEntries(this.getMetadata().entries()));
        return {
            uniqueId: isScreenSharing ? "screensharing_" + user.spaceUserId : user.spaceUserId,
            spaceUser: user,
            streamable: writable(undefined),
            displayOrder: writable(9999),
            priority: LAST_VIDEO_BOX_PRIORITY,
            isMegaphoneSpace: metadata.isMegaphoneSpace,
        };
    }

    /**
     * Start streaming the local camera and microphone to other users in the space.
     * This will trigger an error if the filter type is ALL_USERS (because everyone is always streaming in a ALL_USERS space).
     */
    public startStreaming() {
        if (this.filterType === FilterType.ALL_USERS) {
            throw new Error("Cannot start streaming in a ALL_USERS space because everyone is always streaming");
        }
        this.emitUpdateUser({
            megaphoneState: true,
        });
        this._isStreamingStore.set(true);
    }

    /**
     * Stop streaming the local camera and microphone to other users in the space.
     * This will trigger an error if the filter type is ALL_USERS (because everyone is always streaming in a ALL_USERS space).
     */
    public stopStreaming() {
        if (this.filterType === FilterType.ALL_USERS) {
            throw new Error("Cannot stop streaming in a ALL_USERS space because everyone is always streaming");
        }
        this.emitUpdateUser({
            megaphoneState: false,
        });
        this._isStreamingStore.set(false);
    }

    get isStreamingStore(): Readable<boolean> {
        return this._isStreamingStore;
    }

    private blockUser(spaceUserId: string): void {
        this._blockedUsersStore.update((blockedUsers) => {
            blockedUsers.add(spaceUserId);
            return blockedUsers;
        });
    }

    private unblockUser(spaceUserId: string): void {
        this._blockedUsersStore.update((blockedUsers) => {
            blockedUsers.delete(spaceUserId);
            return blockedUsers;
        });
    }

    private blockByUser(spaceUserId: string): void {
        this._blockedByUsersStore.update((blockedByUsers) => {
            blockedByUsers.add(spaceUserId);
            return blockedByUsers;
        });
    }

    private unblockByUser(spaceUserId: string): void {
        this._blockedByUsersStore.update((blockedByUsers) => {
            blockedByUsers.delete(spaceUserId);
            return blockedByUsers;
        });
    }

    public get destroyed(): boolean {
        return this._isDestroyed;
    }

    /**
     * Method called when the connection to the space is lost (there was a disconnect between the pusher and the back)
     * When called: we mimic a full user removal and we clear all the data related to the space.
     * Then, we retry to join the space.
     */
    public onDisconnect() {
        // Mimic a full user removal
        const users = Array.from(this._users.values());
        for (const user of users) {
            this.removeUser(user.spaceUserId);
        }

        this._peerManager.destroy();
        this._peerManager = new SpacePeerManager(this, this._allBlockedUsersStore);
        this.registerPeerManagerEventHandlers();

        this.reconnect();
    }

    private retryAbortController: AbortController | undefined = undefined;
    private retryTimeout: ReturnType<typeof setTimeout> | undefined = undefined;

    private reconnect() {
        console.log("Reconnecting to space ", this.name);
        if (this.retryAbortController) {
            // Let's cancel the previous reconnection before retrying
            this.retryAbortController.abort(new AbortError());
        }
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
        }

        this.retryAbortController = new AbortController();
        // Let's give it max 5 seconds to reconnect before re-retrying
        const signal = abortAny([
            this.retryAbortController.signal,
            abortTimeout(5000, new TimeoutError("Operation timed out")),
        ]);

        (async () => {
            const spaceUserId = await this._connection.emitJoinSpace(
                this.name,
                this.filterType,
                this._propertiesToSync,
                {
                    signal,
                }
            );

            if (spaceUserId !== this._mySpaceUserId) {
                console.warn(
                    "Reconnected to space but received different spaceUserId",
                    spaceUserId,
                    this._mySpaceUserId
                );
            }

            if (this._registerRefCount !== 0) {
                // If we were previously listening to the space, let's reregister
                this._connection.emitAddSpaceFilter({
                    spaceFilterMessage: {
                        spaceName: this.getName(),
                    },
                });
            }

            console.log("Reconnected to space ", this.name);
        })().catch((e) => {
            if (e instanceof AbortError && !(e instanceof TimeoutError)) {
                // Retry was aborted, do nothing
                return;
            }
            this.retryTimeout = setTimeout(() => {
                this.reconnect();
            }, 5000);
        });
    }

    private registerPeerManagerEventHandlers() {
        this.observeVideoPeerAdded?.unsubscribe();
        this.observeVideoPeerAdded = this._peerManager.videoPeerAdded.subscribe((peer) => {
            const spaceUserId = peer.spaceUserId;

            if (!spaceUserId) {
                console.error("observeVideoPeerAdded : peer has no spaceUserId");
                return;
            }

            const videoBox = this.getVideoPeerVideoBox(spaceUserId);

            if (!videoBox) {
                // Should not happen , we should have a videoBox for all users
                console.error("observeVideoPeerAdded : videoBox not found for user", spaceUserId);
                return;
            }

            try {
                const previousStreamable = get(videoBox.streamable);
                previousStreamable?.closeStreamable();
            } catch (e) {
                console.error("Error while closing previous streamable", e);
                Sentry.captureException(e);
            }

            videoBox.streamable.set(peer);
        });

        this.observeScreenSharingPeerAdded?.unsubscribe();
        this.observeScreenSharingPeerAdded = this._peerManager.screenSharingPeerAdded.subscribe((peer) => {
            const spaceUserId = peer.spaceUserId;

            if (spaceUserId === this._mySpaceUserId) {
                return;
            }

            if (!spaceUserId) {
                console.error("observeVideoPeerAdded : peer has no spaceUserId");
                return;
            }

            const videoBox = this.getScreenSharingPeerVideoBox(spaceUserId);

            if (!videoBox) {
                // Should not happen , we should have a videoBox for all users
                console.error("observeScreenSharingPeerAdded : videoBox not found for user", spaceUserId);
                return;
            }

            videoBox.streamable.set(peer);

            this._highlightedEmbedScreenStore.toggleHighlight(videoBox);
        });
    }
}
