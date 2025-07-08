import { get, readable, Readable, Writable, writable } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import { applyFieldMask } from "protobuf-fieldmask";
import { Observable, Subject, Subscriber } from "rxjs";
import { merge } from "lodash";
import { MapStore } from "@workadventure/store-utils";
import {
    PrivateEvent,
    PublicEvent,
    SpaceEvent,
    UpdateSpaceMetadataMessage,
    FilterType,
    SpaceUser,
    PrivateSpaceEvent,
} from "@workadventure/messages";
import { gameManager } from "../Phaser/Game/GameManager";
import { ExtendedStreamable } from "../Stores/StreamableCollectionStore";
import { CharacterLayerManager } from "../Phaser/Entity/CharacterLayerManager";
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

export class Space implements SpaceInterface {
    private readonly name: string;

    private readonly publicEventsObservables: PublicEventsObservables = {};
    private readonly privateEventsObservables: PrivateEventsObservables = {};
    private _onLeaveSpace = new Subject<void>();
    public readonly onLeaveSpace = this._onLeaveSpace.asObservable();
    private _peerManager: SpacePeerManager | undefined;
    public videoStreamStore: MapStore<string, ExtendedStreamable> = new MapStore<string, ExtendedStreamable>();
    public screenShareStreamStore: MapStore<string, ExtendedStreamable> = new MapStore<string, ExtendedStreamable>();

    private _setUsers: ((value: Map<string, SpaceUserExtended>) => void) | undefined;
    private _users: Map<string, SpaceUserExtended> = new Map<string, SpaceUserExtended>();
    private _addUserSubscriber: Subscriber<SpaceUserExtended> | undefined;
    private _leftUserSubscriber: Subscriber<SpaceUserExtended> | undefined;
    private _updateUserSubscriber: Subscriber<UpdateSpaceUserEvent> | undefined;
    private _registerRefCount = 0;
    public readonly usersStore: Readable<Map<string, Readonly<SpaceUserExtended>>>;
    public readonly observeUserJoined: Observable<SpaceUserExtended>;
    public readonly observeUserLeft: Observable<SpaceUserExtended>;
    public readonly observeUserUpdated: Observable<UpdateSpaceUserEvent>;

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
                this.unregisterSpaceFilter();
            };
        });

        this.observeUserJoined = new Observable<SpaceUserExtended>((subscriber) => {
            this.registerSpaceFilter();
            this._addUserSubscriber = subscriber;

            return () => {
                this.unregisterSpaceFilter();
            };
        });

        this.observeUserLeft = new Observable<SpaceUserExtended>((subscriber) => {
            this.registerSpaceFilter();
            this._leftUserSubscriber = subscriber;

            return () => {
                this.unregisterSpaceFilter();
            };
        });

        this.observeUserUpdated = new Observable<UpdateSpaceUserEvent>((subscriber) => {
            this.registerSpaceFilter();
            this._updateUserSubscriber = subscriber;

            return () => {
                this.unregisterSpaceFilter();
            };
        });
        this._peerManager = new SpacePeerManager(this);
        // TODO: The public and private messages should be forwarded to a special method here from the Registry.
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
    public dispatchPrivateMessage(message: PrivateEvent) {
        const spaceEvent = message.spaceEvent;
        if (spaceEvent === undefined) {
            throw new Error("Received a message without spaceEvent");
        }
        const spaceInnerEvent = spaceEvent.event;
        if (spaceInnerEvent === undefined) {
            throw new Error("Received a message without event");
        }
        const sender = message.senderUserId;
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
        try {
            await this.userLeaveSpace();
        } catch (e) {
            console.error("Error while leaving space", e);
            Sentry.captureException(e);
        }

        for (const subscription of Object.values(this.publicEventsObservables)) {
            subscription.complete();
        }
        for (const subscription of Object.values(this.privateEventsObservables)) {
            subscription.complete();
        }
        this._onLeaveSpace.next();
        this._onLeaveSpace.complete();

        if (this._peerManager) {
            this._peerManager.destroy();
        }
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

    private async extendSpaceUser(user: SpaceUser): Promise<SpaceUserExtended> {
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
    public getSpaceUserBySpaceUserId(id: string): SpaceUserExtended | undefined {
        // const promises = Array.from(this.filters.values()).map((filter) => filter.getUserBySpaceUserId(id));
        // const users = await Promise.all(promises);
        // const foundUser = users.find((user) => user !== undefined);
        // if (foundUser) {
        //     return foundUser;
        // }
        return this._users.get(id);
    }

    //TODO : reimplementer
    public getSpaceUserByUserId(id: number): SpaceUserExtended | undefined {
        // const promises = Array.from(this.filters.values()).map((filter) => filter.getUserByUserId(id));
        // const users = await Promise.all(promises);
        // const foundUser = users.find((user) => user !== undefined);
        // if (foundUser) {
        //     return foundUser;
        // }

        return undefined;
    }

    public async dispatchSound(url: URL): Promise<void> {
        await this.spacePeerManager.dispatchSound(url);
    }

    public getPropertiesToSync(): string[] {
        return this._propertiesToSync;
    }
}

// import merge from "lodash/merge";
// import { PrivateSpaceEvent, SpaceFilterMessage, SpaceUser } from "@workadventure/messages";
// import { Observable, Subject } from "rxjs";
// import { Readable, get, readable, writable, Writable, derived } from "svelte/store";
// import { applyFieldMask } from "protobuf-fieldmask";
// import { Deferred } from "ts-deferred";
// import { CharacterLayerManager } from "../../Phaser/Entity/CharacterLayerManager";
// import { SpaceInterface } from "../SpaceInterface";
// import { RoomConnectionForSpacesInterface } from "../SpaceRegistry/SpaceRegistry";
// import { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
// import { VideoPeer } from "../../WebRtc/VideoPeer";
// import { Streamable } from "../../Stores/StreamableCollectionStore";
// import { RemotePlayerData } from "../../Phaser/Game/RemotePlayersRepository";
// import { gameManager } from "../../Phaser/Game/GameManager";

// function createTrackedSubject<T>(
//     onSubscribe: () => void,
//     onUnsubscribe: () => void
// ): { subject: Subject<T>; observable: Observable<T> } {
//     const subject = new Subject<T>();

//     const observable = new Observable<T>((observer) => {
//         onSubscribe();
//         const subscription = subject.subscribe(observer);

//         return () => {
//             subscription.unsubscribe();
//             onUnsubscribe();
//         };
//     });

//     return { subject, observable };
// }

// export interface SpaceFilterInterface {
//     readonly usersStore: Readable<Map<string, SpaceUserExtended>>;
//     getName(): string;

//     /**
//      * Use this observer to get a description of new users.
//      * It can be easier than subscribing to the usersStore and trying to deduce who the new user is.
//      */
//     readonly observeUserJoined: Observable<SpaceUserExtended>;
//     /**
//      * Use this observer to get a description of users who left.
//      * It can be easier than subscribing to the usersStore and trying to deduce who the gone user is.
//      */
//     readonly observeUserLeft: Observable<SpaceUserExtended>;
// }

// type ReactiveSpaceUser = {
//     [K in keyof Omit<SpaceUser, "spaceUserId">]: Readonly<Readable<SpaceUser[K]>>;
// } & {
//     spaceUserId: string;
//     playUri: string | undefined;
//     roomName: string | undefined;
// };

// export type SpaceUserExtended = SpaceUser & {
//     wokaPromise: Promise<string> | undefined;
//     getWokaBase64: string;
//     updateSubject: Subject<{
//         newUser: SpaceUserExtended;
//         changes: SpaceUser;
//         updateMask: string[];
//     }>;
//     emitPrivateEvent: (message: NonNullable<PrivateSpaceEvent["event"]>) => void;
//     //emitter: JitsiEventEmitter | undefined;
//     space: SpaceInterface;
//     reactiveUser: ReactiveSpaceUser;
//     getPeerStore: () => Readable<VideoPeer> | undefined;
//     getScreenSharingPeerStore: () => Readable<ScreenSharingPeer> | undefined;
//     getPlayer: () => Promise<RemotePlayerData> | undefined;
//     userId: number;
// };

// export type Filter = SpaceFilterMessage["filter"];

// // export interface JitsiEventEmitter {
// //     emitKickOffUserMessage(userId: string): void;
// //     emitMuteEveryBodySpace(): void;
// //     emitMuteVideoEveryBodySpace(): void;
// //     emitMuteParticipantIdSpace(userId: string): void;
// //     emitMuteVideoParticipantIdSpace(userId: string): void;
// //     emitProximityPublicMessage(message: string): void;
// //     emitProximityPrivateMessage(message: string, receiverUserId: number): void;
// // }

// export abstract class SpaceFilter implements SpaceFilterInterface {
//     private _setUsers: ((value: Map<string, SpaceUserExtended>) => void) | undefined;
//     readonly usersStore: Readable<Map<string, Readonly<SpaceUserExtended>>>;
//     private _users: Map<string, SpaceUserExtended> = new Map<string, SpaceUserExtended>();
//     private isSubscribe = false;
//     private _addUserSubscriber: Subject<SpaceUserExtended> | undefined;
//     private _leftUserSubscriber: Subject<SpaceUserExtended> | undefined;
//     public readonly observeUserJoined: Observable<SpaceUserExtended>;
//     public readonly observeUserLeft: Observable<SpaceUserExtended>;
//     private registerRefCount = 0;

//     protected constructor(
//         private _name: string,
//         private _space: SpaceInterface,
//         private _connection: RoomConnectionForSpacesInterface,
//         private _filter: Filter,
//         private _remotePlayersRepository = gameManager.getCurrentGameScene().getRemotePlayersRepository()
//     ) {
//         this.usersStore = readable(new Map<SpaceUser["spaceUserId"], SpaceUserExtended>(), (set) => {
//             this.registerSpaceFilter();
//             this._setUsers = set;
//             set(this._users);
//             this.isSubscribe = true;

//             return () => {
//                 this.unregisterSpaceFilter();
//                 this.isSubscribe = false;
//             };
//         });

//         const { subject: observeUserJoinedSubject, observable: observeUserJoinedObservable } =
//             createTrackedSubject<SpaceUserExtended>(
//                 () => {
//                     this.registerSpaceFilter();
//                 },
//                 () => {
//                     this.unregisterSpaceFilter();
//                 }
//             );

//         this.observeUserJoined = observeUserJoinedObservable;
//         this._addUserSubscriber = observeUserJoinedSubject;

//         const { subject: observeUserLeftSubject, observable: observeUserLeftObservable } =
//             createTrackedSubject<SpaceUserExtended>(
//                 () => {
//                     this.registerSpaceFilter();
//                 },
//                 () => {
//                     this.unregisterSpaceFilter();
//                 }
//             );

//         this.observeUserLeft = observeUserLeftObservable;
//         this._leftUserSubscriber = observeUserLeftSubject;
//     }
//     async addUser(user: SpaceUser): Promise<SpaceUserExtended> {
//         const extendSpaceUser = await this.extendSpaceUser(user);

//         if (!this._users.has(user.spaceUserId)) {
//             this._users.set(user.spaceUserId, extendSpaceUser);
//             if (this._setUsers) {
//                 this._setUsers(this._users);
//             }
//             if (this._addUserSubscriber) {
//                 this._addUserSubscriber.next(extendSpaceUser);
//             }
//         }

//         return extendSpaceUser;
//     }

//     getUsers(): SpaceUserExtended[] {
//         return Array.from(get(this.usersStore).values());
//     }
//     removeUser(spaceUserId: string): void {
//         const user = this._users.get(spaceUserId);
//         if (user) {
//             this._users.delete(spaceUserId);
//             if (this._setUsers) {
//                 this._setUsers(this._users);
//             }
//             if (this._leftUserSubscriber) {
//                 this._leftUserSubscriber.next(user);
//             }
//         }

//         const peerConnection = this._space.videoStreamStore.get(spaceUserId);
//         if (peerConnection) {
//             if (peerConnection instanceof VideoPeer) {
//                 peerConnection.destroy();
//             }
//             this._space.videoStreamStore.delete(spaceUserId);
//         }

//         const screenSharingPeerConnection = this._space.screenShareStreamStore.get(spaceUserId);
//         if (screenSharingPeerConnection) {
//             if (screenSharingPeerConnection instanceof ScreenSharingPeer) {
//                 screenSharingPeerConnection.destroy();
//             }
//             this._space.screenShareStreamStore.delete(spaceUserId);
//         }
//     }

//     updateUserData(newData: SpaceUser, updateMask: string[]): void {
//         if (!newData.spaceUserId && newData.spaceUserId !== "") return;

//         const userToUpdate = this._users.get(newData.spaceUserId);

//         if (!userToUpdate) return;

//         const maskedNewData = applyFieldMask(newData, updateMask);

//         merge(userToUpdate, maskedNewData);

//         for (const key in maskedNewData) {
//             // We allow ourselves a not 100% exact type cast here.
//             // Technically, newData could contain any key, not only keys part of SpaceUser type (because additional keys
//             // are allowed in Javascript objects)
//             // However, we know for sure that the keys of newData are part of SpaceUser type, so we can safely cast them.
//             const castKey = key as keyof typeof newData;
//             // Out of security, we add a runtime check to ensure that the key is part of SpaceUser type
//             if (castKey in userToUpdate.reactiveUser) {
//                 // Finally, we cast the "Readable" to "Writable" to be able to update the value. We know for sure it is
//                 // writable because the only place that can create a "ReactiveSpaceUser" is the "extendSpaceUser" method.
//                 const store = userToUpdate.reactiveUser[castKey];
//                 if (typeof store === "object" && "set" in store) {
//                     (store as Writable<unknown>).set(newData[castKey]);
//                 }
//             }
//         }

//         /*if (this._setUsers) {
//             this._setUsers(this._users);
//         }*/
//     }

//     protected setFilter(newFilter: Filter) {
//         this._filter = newFilter;
//         if (this.isSubscribe) {
//             this.updateSpaceFilter();
//         }
//     }
//     getName(): string {
//         return this._name;
//     }

//     private async extendSpaceUser(user: SpaceUser): Promise<SpaceUserExtended> {
//         const wokaBase64 = await CharacterLayerManager.wokaBase64(user.characterTextures);

//         const extendedUser = {
//             ...user,
//             wokaPromise: undefined,
//             getWokaBase64: wokaBase64,
//             updateSubject: new Subject<{
//                 newUser: SpaceUserExtended;
//                 changes: SpaceUser;
//                 updateMask: string[];
//             }>(),
//             //emitter,
//             emitPrivateEvent: (message: NonNullable<PrivateSpaceEvent["event"]>) => {
//                 this._connection.emitPrivateSpaceEvent(this._space.getName(), message, user.spaceUserId);
//             },
//             space: this._space,
//             getPeerStore: () => {
//                 const peerStore = this._space.videoStreamStore;
//                 if (peerStore) {
//                     return derived(peerStore, ($peerStore) => {
//                         return $peerStore.get(user.spaceUserId);
//                     });
//                 }
//                 return undefined;
//             },
//             getScreenSharingPeerStore: () => {
//                 const screenSharingPeerStore = this._space.screenShareStreamStore;
//                 if (screenSharingPeerStore) {
//                     return derived(screenSharingPeerStore, ($screenSharingPeerStore) => {
//                         return $screenSharingPeerStore.get(user.spaceUserId);
//                     });
//                 }
//                 return undefined;
//             },
//             getPlayer: () => {
//                 return this._remotePlayersRepository.getPlayer(this.extractUserIdFromSpaceId(user.spaceUserId));
//             },
//             userId: this.extractUserIdFromSpaceId(user.spaceUserId),
//         } as unknown as SpaceUserExtended;

//         extendedUser.reactiveUser = new Proxy(
//             {
//                 spaceUserId: extendedUser.spaceUserId,
//                 roomName: extendedUser.roomName,
//                 playUri: extendedUser.playUri,
//             } as unknown as ReactiveSpaceUser,
//             {
//                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
//                 get(target: any, property: PropertyKey, receiver: unknown) {
//                     if (typeof property !== "string") {
//                         return Reflect.get(target, property, receiver);
//                     }

//                     if (target[property as keyof ReactiveSpaceUser]) {
//                         return target[property as keyof ReactiveSpaceUser];
//                     } else {
//                         if (property in extendedUser) {
//                             //@ts-ignore We check just above that the property is in extendedUser
//                             target[property] = writable(extendedUser[property]);
//                             return target[property];
//                         } else {
//                             return Reflect.get(target, property, receiver);
//                         }
//                     }
//                 },
//             }
//         );

//         return extendedUser;
//     }

//     private extractUserIdFromSpaceId(spaceId: string): number {
//         const lastUnderscoreIndex = spaceId.lastIndexOf("_");
//         if (lastUnderscoreIndex === -1) {
//             throw new Error("Invalid spaceId format: no underscore found");
//         }
//         const userId = parseInt(spaceId.substring(lastUnderscoreIndex + 1));
//         if (isNaN(userId)) {
//             throw new Error("Invalid userId format: not a number");
//         }
//         return userId;
//     }

//     private unregisterSpaceFilter() {
//         this.registerRefCount--;
//         if (this.registerRefCount === 0) {
//             this._connection.emitRemoveSpaceFilter({
//                 spaceFilterMessage: {
//                     filterName: this._name,
//                     spaceName: this._space.getName(),
//                 },
//             });
//         }
//     }

//     private updateSpaceFilter() {
//         this._connection.emitUpdateSpaceFilter({
//             spaceFilterMessage: {
//                 filterName: this._name,
//                 spaceName: this._space.getName(),
//                 filter: this._filter,
//             },
//         });
//     }
//     private registerSpaceFilter() {
//         if (this.registerRefCount === 0) {
//             this._connection.emitAddSpaceFilter({
//                 spaceFilterMessage: {
//                     filterName: this._name,
//                     spaceName: this._space.getName(),
//                     filter: this._filter,
//                 },
//             });
//         }
//         this.registerRefCount++;
//     }

//     /**
//      * Returns a derived store that aggregates all peer stores from the extended users.
//      */
//     public getAllPeerStores(): Readable<Map<string, Readable<VideoPeer>>> {
//         return derived(this.usersStore, ($usersStore) => {
//             const allPeers: Map<string, Readable<VideoPeer>> = new Map();
//             for (const user of $usersStore.values()) {
//                 const peerStore = user.getPeerStore();
//                 if (peerStore !== undefined) {
//                     allPeers.set(user.spaceUserId, peerStore);
//                 }
//             }
//             return allPeers;
//         });
//     }

//     public getAllScreenSharingPeerStores(): Readable<Map<string, Readable<ScreenSharingPeer>>> {
//         return derived(this.usersStore, ($usersStore) => {
//             const allPeers: Map<string, Readable<ScreenSharingPeer>> = new Map();
//             for (const user of $usersStore.values()) {
//                 const peerStore = user.getScreenSharingPeerStore();
//                 if (peerStore !== undefined) {
//                     allPeers.set(user.spaceUserId, peerStore);
//                 }
//             }
//             return allPeers;
//         });
//     }

//     getUserBySpaceUserId(spaceUserId: string): Promise<SpaceUserExtended | undefined> {
//         if (this._users.has(spaceUserId)) {
//             return Promise.resolve(this._users.get(spaceUserId));
//         }

//         const deferred = new Deferred<SpaceUserExtended>();

//         const subscription = this.observeUserJoined.subscribe((user) => {
//             if (user.spaceUserId === spaceUserId) {
//                 deferred.resolve(user);
//                 subscription.unsubscribe();
//             }
//         });

//         return Promise.race([
//             deferred.promise,
//             new Promise<SpaceUserExtended>((resolve, reject) => {
//                 setTimeout(() => {
//                     subscription.unsubscribe();
//                     reject(new Error("Timeout waiting for user data"));
//                 }, 5000);
//             }),
//         ]);
//     }

//     getUserByUserId(userId: number): Promise<SpaceUserExtended | undefined> {
//         for (const user of this._users.values()) {
//             if (this.extractUserIdFromSpaceUserId(user.spaceUserId) === userId) {
//                 return Promise.resolve(user);
//             }
//         }

//         const deferred = new Deferred<SpaceUserExtended>();

//         const subscription = this.observeUserJoined.subscribe((user) => {
//             if (this.extractUserIdFromSpaceUserId(user.spaceUserId) === userId) {
//                 deferred.resolve(user);
//                 subscription.unsubscribe();
//             }
//         });

//         return Promise.race([
//             deferred.promise,
//             new Promise<SpaceUserExtended>((resolve, reject) => {
//                 setTimeout(() => {
//                     subscription.unsubscribe();
//                     reject(new Error("Timeout waiting for user data"));
//                 }, 5000);
//             }),
//         ]);
//     }

//     private extractUserIdFromSpaceUserId(spaceUserId: string): number | undefined {
//         const parts = spaceUserId.split("_");
//         const lastPart = parts[parts.length - 1];
//         const num = Number(lastPart);
//         return isNaN(num) ? undefined : num;
//     }
// }
