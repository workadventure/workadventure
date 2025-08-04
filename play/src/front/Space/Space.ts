import { derived, get, readable, Readable, Writable, writable } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import { applyFieldMask } from "protobuf-fieldmask";
import { Observable, Subject, Subscriber, Subscription } from "rxjs";
import { merge } from "lodash";
import { MapStore } from "@workadventure/store-utils";
import {
    PublicEvent,
    SpaceEvent,
    UpdateSpaceMetadataMessage,
    FilterType,
    SpaceUser,
    PrivateSpaceEvent,
    PrivateEventPusherToFront,
} from "@workadventure/messages";
import { gameManager } from "../Phaser/Game/GameManager";
import { ExtendedStreamable } from "../Stores/StreamableCollectionStore";
import { CharacterLayerManager } from "../Phaser/Entity/CharacterLayerManager";
import { VideoPeer } from "../WebRtc/VideoPeer";
import { ScreenSharingPeer } from "../WebRtc/ScreenSharingPeer";
import {
    PrivateEventsObservables,
    PublicEventsObservables,
    SpaceInterface,
    SpaceUserUpdate,
    UpdateSpaceUserEvent,
    ReactiveSpaceUser,
    SpaceUserExtended,
} from "./SpaceInterface";
import { SpaceNameIsEmptyError } from "./Errors/SpaceError";
import { RoomConnectionForSpacesInterface } from "./SpaceRegistry/SpaceRegistry";
import { SimplePeerConnectionInterface, SpacePeerManager } from "./SpacePeerManager/SpacePeerManager";
import { lookupUserById } from "./Utils/UserLookup";

export class Space implements SpaceInterface {
    private readonly name: string;

    private readonly publicEventsObservables: PublicEventsObservables = {};
    private readonly privateEventsObservables: PrivateEventsObservables = {};
    private _onLeaveSpace = new Subject<void>();
    public readonly onLeaveSpace = this._onLeaveSpace.asObservable();
    private _peerManager: SpacePeerManager | undefined;
    public allVideoStreamStore: MapStore<string, ExtendedStreamable> = new MapStore<string, ExtendedStreamable>();
    public allScreenShareStreamStore: MapStore<string, ExtendedStreamable> = new MapStore<string, ExtendedStreamable>();
    public videoStreamStore: Readable<Map<string, ExtendedStreamable>>;
    public screenShareStreamStore: Readable<Map<string, ExtendedStreamable>>;

    private _setUsers: ((value: Map<string, SpaceUserExtended>) => void) | undefined;
    private _users: Map<string, SpaceUserExtended> = new Map<string, SpaceUserExtended>();
    private _addUserSubscriber: Subscriber<SpaceUserExtended> | undefined;
    private _leftUserSubscriber: Subscriber<SpaceUserExtended> | undefined;
    private _updateUserSubscriber: Subscriber<UpdateSpaceUserEvent> | undefined;
    private _registerRefCount = 0;
    private isDestroyed = false;
    public readonly usersStore: Readable<Map<string, Readonly<SpaceUserExtended>>>;
    public readonly observeUserJoined: Observable<SpaceUserExtended>;
    public readonly observeUserLeft: Observable<SpaceUserExtended>;
    public readonly observeUserUpdated: Observable<UpdateSpaceUserEvent>;

    private readonly observeSyncUserAdded: Subscription;
    private readonly observeSyncUserUpdated: Subscription;
    private readonly observeSyncUserRemoved: Subscription;

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
        //TODO : mock dans les tests
        private _remotePlayersRepository = gameManager.getCurrentGameScene().getRemotePlayersRepository()
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
            this._addUserSubscriber = subscriber;

            return () => {
                if (!this.isDestroyed) {
                    this.unregisterSpaceFilter();
                }
            };
        });

        this.observeUserLeft = new Observable<SpaceUserExtended>((subscriber) => {
            this.registerSpaceFilter();
            this._leftUserSubscriber = subscriber;

            return () => {
                if (!this.isDestroyed) {
                    this.unregisterSpaceFilter();
                }
            };
        });

        this.observeUserUpdated = new Observable<UpdateSpaceUserEvent>((subscriber) => {
            this.registerSpaceFilter();
            this._updateUserSubscriber = subscriber;

            return () => {
                if (!this.isDestroyed) {
                    this.unregisterSpaceFilter();
                }
            };
        });

        this.videoStreamStore = derived(
            [this.allVideoStreamStore, this.usersStore],
            ([videoStreamStore, usersStore]) => {
                const newVideoStreamStore = new Map<string, ExtendedStreamable>();
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
                const newScreenShareStreamStore = new Map<string, ExtendedStreamable>();
                for (const [key, value] of screenShareStreamStore.entries()) {
                    if (usersStore.has(key)) {
                        newScreenShareStreamStore.set(key, value);
                    }
                }
                return newScreenShareStreamStore;
            }
        );

        this._peerManager = new SpacePeerManager(this);
        this.observeSyncUserAdded = this.observePrivateEvent("addSpaceUserMessage").subscribe((message) => {
            if (!message.addSpaceUserMessage.user) {
                console.error("addSpaceUserMessage is missing a user");
                return;
            }
            this.addUser(message.addSpaceUserMessage.user).catch((e) => console.error(e));
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
        metadata = new Map<string, unknown>()
    ): Promise<Space> {
        await connection.emitJoinSpace(name, filterType, propertiesToSync);
        const space = new Space(name, metadata, connection, filterType, propertiesToSync);
        return space;
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
    }

    private async userLeaveSpace() {
        await this._connection.emitLeaveSpace(this.name);
    }

    public emitUpdateSpaceMetadata(metadata: Map<string, unknown>) {
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
        this._connection.emitPublicSpaceEvent(this.name, message);
    }

    public emitPrivateMessage(message: NonNullable<PrivateSpaceEvent["event"]>, receiverUserId: string): void {
        this._connection.emitPrivateSpaceEvent(this.name, message, receiverUserId);
    }

    /**
     * Sends a message to the server to update our user in the space.
     */
    public emitUpdateUser(spaceUser: SpaceUserUpdate): void {
        this._connection.emitUpdateSpaceUserMessage(this.name, spaceUser);
    }

    /**
     * IMPORTANT: The only valid way to destroy a space is to use the SpaceRegistry.
     * Do not call this method directly.
     */
    async destroy() {
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

        if (this._peerManager) {
            this._peerManager.destroy();
        }

        this.allVideoStreamStore.forEach((peer) => {
            if (peer instanceof VideoPeer) {
                peer.destroy();
            }
        });

        this.allScreenShareStreamStore.forEach((peer) => {
            if (peer instanceof ScreenSharingPeer) {
                peer.destroy();
            }
        });

        if (this._registerRefCount > 0) {
            this.unregisterSpaceFilter();
        }

        try {
            await this.userLeaveSpace();
        } catch (e) {
            console.error("Error while leaving space", e);
            Sentry.captureException(e);
        }
        this.isDestroyed = true;
    }

    get simplePeer(): SimplePeerConnectionInterface | undefined {
        return this._peerManager?.getPeer();
    }

    get spacePeerManager(): SpacePeerManager {
        if (!this._peerManager) {
            throw new Error("SpacePeerManager is not initialized");
        }
        return this._peerManager;
    }

    /**
     * @returns an observable that emits the new metadata of the space when it changes.
     */
    watchSpaceMetadata(): Observable<UpdateSpaceMetadataMessage> {
        return this._connection.updateSpaceMetadataMessageStream;
    }

    //FROM SPACE FILTER

    getUsers(): SpaceUserExtended[] {
        return Array.from(get(this.usersStore).values());
    }

    async addUser(user: SpaceUser): Promise<SpaceUserExtended> {
        const extendSpaceUser = await this.extendSpaceUser(user);

        if (!this._users.has(user.spaceUserId)) {
            this._users.set(user.spaceUserId, extendSpaceUser);
            if (this._setUsers) {
                this._setUsers(this._users);
            }
            if (this._addUserSubscriber) {
                this._addUserSubscriber.next(extendSpaceUser);
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
            if (this._leftUserSubscriber) {
                this._leftUserSubscriber.next(user);
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

        if (this._updateUserSubscriber) {
            this._updateUserSubscriber.next({
                newUser: userToUpdate,
                changes: maskedNewData,
                updateMask: updateMask,
            });
        }

        /*if (this._setUsers) {
            this._setUsers(this._users);
        }*/
    }

    public async extendSpaceUser(user: SpaceUser): Promise<SpaceUserExtended> {
        const wokaBase64 = await CharacterLayerManager.wokaBase64(user.characterTextures);

        const extendedUser = {
            ...user,
            wokaPromise: undefined,
            getWokaBase64: wokaBase64,
            updateSubject: new Subject<{
                newUser: SpaceUserExtended;
                changes: SpaceUser;
                updateMask: string[];
            }>(),
            //emitter,
            emitPrivateEvent: (message: NonNullable<PrivateSpaceEvent["event"]>) => {
                this._connection.emitPrivateSpaceEvent(this.getName(), message, user.spaceUserId);
            },
            getPlayer: () => {
                return this._remotePlayersRepository.getPlayer(this.extractUserIdFromSpaceId(user.spaceUserId));
            },
            space: this,
        } as unknown as SpaceUserExtended;

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

    public requestFullSync() {
        if (this._registerRefCount === 0) return;
        this._connection.emitRequestFullSync(this.name, this.getUsers());
    }

    private extractUserIdFromSpaceId(spaceId: string): number {
        const lastUnderscoreIndex = spaceId.lastIndexOf("_");
        if (lastUnderscoreIndex === -1) {
            throw new Error("Invalid spaceId format: no underscore found");
        }
        const userId = parseInt(spaceId.substring(lastUnderscoreIndex + 1));
        if (isNaN(userId)) {
            throw new Error("Invalid userId format: not a number");
        }
        return userId;
    }

    private unregisterSpaceFilter() {
        this._registerRefCount--;
        if (this._registerRefCount === 0) {
            this._connection.emitRemoveSpaceFilter({
                spaceFilterMessage: {
                    spaceName: this.getName(),
                },
            });
        }
    }

    private registerSpaceFilter() {
        if (this._registerRefCount === 0) {
            this._connection.emitAddSpaceFilter({
                spaceFilterMessage: {
                    spaceName: this.getName(),
                },
            });
        }
        this._registerRefCount++;
    }

    //TODO : partie a modifier car plus de spacefilter
    public async getSpaceUserBySpaceUserId(id: string): Promise<SpaceUserExtended | undefined> {
        return lookupUserById(this.extractUserIdFromSpaceId(id), this, 30_000);
    }

    //TODO : reimplementer
    public async getSpaceUserByUserId(id: number): Promise<SpaceUserExtended | undefined> {
        return lookupUserById(id, this, 30_000);
    }

    public async dispatchSound(url: URL): Promise<void> {
        await this.spacePeerManager.dispatchSound(url);
    }

    public getPropertiesToSync(): string[] {
        return this._propertiesToSync;
    }
}
