import merge from "lodash/merge";
import { PrivateSpaceEvent, SpaceFilterMessage, SpaceUser } from "@workadventure/messages";
import { Observable, Subject } from "rxjs";
import { Readable, get, readable, writable, Writable, derived } from "svelte/store";
import { applyFieldMask } from "protobuf-fieldmask";
import { Deferred } from "ts-deferred";
import { CharacterLayerManager } from "../../Phaser/Entity/CharacterLayerManager";
import { SpaceInterface } from "../SpaceInterface";
import { RoomConnectionForSpacesInterface } from "../SpaceRegistry/SpaceRegistry";
import { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
import { VideoPeer } from "../../WebRtc/VideoPeer";
import { Streamable } from "../../Stores/StreamableCollectionStore";
import { RemotePlayerData } from "../../Phaser/Game/RemotePlayersRepository";
import { gameManager } from "../../Phaser/Game/GameManager";

function createTrackedSubject<T>(
    onSubscribe: () => void,
    onUnsubscribe: () => void
): { subject: Subject<T>; observable: Observable<T> } {
    const subject = new Subject<T>();
    let subscriberCount = 0;

    const observable = new Observable<T>((observer) => {
        if (subscriberCount === 0) {
            onSubscribe();
        }
        subscriberCount++;

        const subscription = subject.subscribe(observer);

        return () => {
            subscription.unsubscribe();
            subscriberCount--;
            if (subscriberCount === 0) {
                onUnsubscribe();
            }
        };
    });

    return { subject, observable };
}

// FIXME: refactor from the standpoint of the consumer. addUser, removeUser should be removed...
export interface SpaceFilterInterface {
    //userExist(userId: number): boolean;
    //addUser(user: SpaceUser): Promise<SpaceUserExtended>;
    readonly usersStore: Readable<Map<string, SpaceUserExtended>>;
    //removeUser(userId: number): void;
    //updateUserData(userdata: Partial<SpaceUser>): void;
    getName(): string;

    /**
     * Use this observer to get a description of new users.
     * It can be easier than subscribing to the usersStore and trying to deduce who the new user is.
     */
    readonly observeUserJoined: Observable<SpaceUserExtended>;
    /**
     * Use this observer to get a description of users who left.
     * It can be easier than subscribing to the usersStore and trying to deduce who the gone user is.
     */
    readonly observeUserLeft: Observable<SpaceUserExtended>;
}

type ReactiveSpaceUser = {
    [K in keyof Omit<SpaceUser, "spaceUserId">]: Readonly<Readable<SpaceUser[K]>>;
} & {
    spaceUserId: string;
    playUri: string | undefined;
    roomName: string | undefined;
};

export type SpaceUserExtended = SpaceUser & {
    wokaPromise: Promise<string> | undefined;
    getWokaBase64: string;
    updateSubject: Subject<{
        newUser: SpaceUserExtended;
        changes: SpaceUser;
        updateMask: string[];
    }>;
    emitPrivateEvent: (message: NonNullable<PrivateSpaceEvent["event"]>) => void;
    //emitter: JitsiEventEmitter | undefined;
    space: SpaceInterface;
    reactiveUser: ReactiveSpaceUser;
    getPeerStore: () => Readable<VideoPeer> | undefined;
    getScreenSharingPeerStore: () => Readable<ScreenSharingPeer> | undefined;
    getLivekitVideoStreamStore: () => Readable<Streamable> | undefined;
    getLivekitScreenShareStreamStore: () => Readable<Streamable> | undefined;
    getPlayer: () => Promise<RemotePlayerData> | undefined;
    userId: number;
};

export type Filter = SpaceFilterMessage["filter"];

// export interface JitsiEventEmitter {
//     emitKickOffUserMessage(userId: string): void;
//     emitMuteEveryBodySpace(): void;
//     emitMuteVideoEveryBodySpace(): void;
//     emitMuteParticipantIdSpace(userId: string): void;
//     emitMuteVideoParticipantIdSpace(userId: string): void;
//     emitProximityPublicMessage(message: string): void;
//     emitProximityPrivateMessage(message: string, receiverUserId: number): void;
// }

//TODO : mettre une fonction qui permet de récuperer les peer d'un user dans direct dans un store qui va etre dans le space
export abstract class SpaceFilter implements SpaceFilterInterface {
    private _setUsers: ((value: Map<string, SpaceUserExtended>) => void) | undefined;
    readonly usersStore: Readable<Map<string, Readonly<SpaceUserExtended>>>;
    private _users: Map<string, SpaceUserExtended> = new Map<string, SpaceUserExtended>();
    private isSubscribe = false;
    private _addUserSubscriber: Subject<SpaceUserExtended> | undefined;
    private _leftUserSubscriber: Subject<SpaceUserExtended> | undefined;
    public readonly observeUserJoined: Observable<SpaceUserExtended>;
    public readonly observeUserLeft: Observable<SpaceUserExtended>;
    private registerRefCount = 0;

    protected constructor(
        private _name: string,
        private _space: SpaceInterface,
        private _connection: RoomConnectionForSpacesInterface,
        private _filter: Filter,
        private _remotePlayersRepository = gameManager.getCurrentGameScene().getRemotePlayersRepository()
    ) {
        this.usersStore = readable(new Map<SpaceUser["spaceUserId"], SpaceUserExtended>(), (set) => {
            this.registerSpaceFilter();
            this._setUsers = set;
            set(this._users);
            this.isSubscribe = true;

            return () => {
                this.unregisterSpaceFilter();
                this.isSubscribe = false;
            };
        });

        const { subject: observeUserJoinedSubject } = createTrackedSubject<SpaceUserExtended>(
            () => {
                this.registerSpaceFilter();
            },
            () => this.unregisterSpaceFilter()
        );

        this.observeUserJoined = observeUserJoinedSubject.asObservable();
        this._addUserSubscriber = observeUserJoinedSubject;

        const { subject: observeUserLeftSubject } = createTrackedSubject<SpaceUserExtended>(
            () => this.registerSpaceFilter(),
            () => this.unregisterSpaceFilter()
        );

        this.observeUserLeft = observeUserLeftSubject.asObservable();
        this._leftUserSubscriber = observeUserLeftSubject;
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

    getUsers(): SpaceUserExtended[] {
        return Array.from(get(this.usersStore).values());
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

        const peerConnection = this._space.livekitVideoStreamStore.get(spaceUserId);
        if (peerConnection) {
            if (peerConnection instanceof VideoPeer) {
                peerConnection.destroy();
            }
            this._space.livekitVideoStreamStore.delete(spaceUserId);
        }

        const screenSharingPeerConnection = this._space.livekitScreenShareStreamStore.get(spaceUserId);
        if (screenSharingPeerConnection) {
            if (screenSharingPeerConnection instanceof ScreenSharingPeer) {
                screenSharingPeerConnection.destroy();
            }
            this._space.livekitScreenShareStreamStore.delete(spaceUserId);
        }
    }

    updateUserData(newData: SpaceUser, updateMask: string[]): void {
        if (!newData.spaceUserId && newData.spaceUserId !== "") return;

        const userToUpdate = this._users.get(newData.spaceUserId);

        if (!userToUpdate) return;

        const maskedNewData = applyFieldMask(newData, updateMask);

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

        /*if (this._setUsers) {
            this._setUsers(this._users);
        }*/
    }

    protected setFilter(newFilter: Filter) {
        this._filter = newFilter;
        if (this.isSubscribe) {
            this.updateSpaceFilter();
        }
    }
    getName(): string {
        return this._name;
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
                this._connection.emitPrivateSpaceEvent(this._space.getName(), message, user.spaceUserId);
            },
            space: this._space,
            getPeerStore: () => {
                const peerStore = this._space.videoPeerStore;
                if (peerStore) {
                    return derived(peerStore, ($peerStore) => {
                        return $peerStore.get(user.spaceUserId);
                    });
                }
                return undefined;
            },
            getLivekitVideoStreamStore: () => {
                const livekitVideoStreamStore = this._space.livekitVideoStreamStore;

                const store = derived(livekitVideoStreamStore, ($livekitVideoStreamStore) => {
                    return $livekitVideoStreamStore.get(user.spaceUserId);
                });

                return store;
            },
            getLivekitScreenShareStreamStore: () => {
                const livekitScreenShareStreamStore = this._space.livekitScreenShareStreamStore;
                if (livekitScreenShareStreamStore) {
                    return derived(livekitScreenShareStreamStore, ($livekitScreenShareStreamStore) => {
                        return $livekitScreenShareStreamStore.get(user.spaceUserId);
                    });
                }
                return undefined;
            },
            getScreenSharingPeerStore: () => {
                const screenSharingPeerStore = this._space.screenSharingPeerStore;
                if (screenSharingPeerStore) {
                    return derived(screenSharingPeerStore, ($screenSharingPeerStore) => {
                        return $screenSharingPeerStore.get(user.spaceUserId);
                    });
                }
                return undefined;
            },
            getPlayer: () => {
                return this._remotePlayersRepository.getPlayer(this.extractUserIdFromSpaceId(user.spaceUserId));
            },
            userId: this.extractUserIdFromSpaceId(user.spaceUserId),
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
        this.registerRefCount--;
        if (this.registerRefCount === 0) {
            this._connection.emitRemoveSpaceFilter({
                spaceFilterMessage: {
                    filterName: this._name,
                    spaceName: this._space.getName(),
                },
            });
        }
    }

    private updateSpaceFilter() {
        this._connection.emitUpdateSpaceFilter({
            spaceFilterMessage: {
                filterName: this._name,
                spaceName: this._space.getName(),
                filter: this._filter,
            },
        });
    }
    private registerSpaceFilter() {
        if (this.registerRefCount === 0) {
            this._connection.emitAddSpaceFilter({
                spaceFilterMessage: {
                    filterName: this._name,
                    spaceName: this._space.getName(),
                    filter: this._filter,
                },
            });
        }
        this.registerRefCount++;
    }

    /**
     * Returns a derived store that aggregates all peer stores from the extended users.
     */
    public getAllPeerStores(): Readable<Map<string, Readable<VideoPeer>>> {
        return derived(this.usersStore, ($usersStore) => {
            const allPeers: Map<string, Readable<VideoPeer>> = new Map();
            for (const user of $usersStore.values()) {
                const peerStore = user.getPeerStore();
                if (peerStore !== undefined) {
                    allPeers.set(user.spaceUserId, peerStore);
                }
            }
            return allPeers;
        });
    }

    public getAllScreenSharingPeerStores(): Readable<Map<string, Readable<ScreenSharingPeer>>> {
        return derived(this.usersStore, ($usersStore) => {
            const allPeers: Map<string, Readable<ScreenSharingPeer>> = new Map();
            for (const user of $usersStore.values()) {
                const peerStore = user.getScreenSharingPeerStore();
                if (peerStore !== undefined) {
                    allPeers.set(user.spaceUserId, peerStore);
                }
            }
            return allPeers;
        });
    }

    public getAllLivekitVideoStreamStores(): Readable<Map<string, Readable<Streamable>>> {
        return derived(this.usersStore, ($usersStore) => {
            const allPeers: Map<string, Readable<Streamable>> = new Map();
            for (const user of $usersStore.values()) {
                const peerStore = user.getLivekitVideoStreamStore();
                if (peerStore !== undefined) {
                    allPeers.set(user.spaceUserId, peerStore);
                }
            }
            return allPeers;
        });
    }

    public getAllLivekitScreenShareStreamStores(): Readable<Map<string, Readable<Streamable>>> {
        return derived(this.usersStore, ($usersStore) => {
            const allPeers: Map<string, Readable<Streamable>> = new Map();
            for (const user of $usersStore.values()) {
                const peerStore = user.getLivekitScreenShareStreamStore();
                if (peerStore !== undefined) {
                    allPeers.set(user.spaceUserId, peerStore);
                }
            }
            return allPeers;
        });
    }

    getUserBySpaceUserId(spaceUserId: string): Promise<SpaceUserExtended | undefined> {
        if (this._users.has(spaceUserId)) {
            return Promise.resolve(this._users.get(spaceUserId));
        }

        // Create a deferred promise that will be resolved when the user is added
        const deferred = new Deferred<SpaceUserExtended>();

        // Subscribe to user joined events to resolve the promise when the user is found
        const subscription = this.observeUserJoined.subscribe((user) => {
            if (user.spaceUserId === spaceUserId) {
                deferred.resolve(user);
                subscription.unsubscribe();
            }
        });

        // Return a promise that either resolves with the user or rejects after a timeout
        return Promise.race([
            deferred.promise,
            new Promise<SpaceUserExtended>((resolve, reject) => {
                setTimeout(() => {
                    subscription.unsubscribe();
                    reject(new Error("Timeout waiting for user data"));
                }, 5000);
            }),
        ]);
    }

    getUserByUserId(userId: number): Promise<SpaceUserExtended | undefined> {
        // First check if user exists in current users
        for (const user of this._users.values()) {
            if (this.getUserIdFromSpaceUserId(user.spaceUserId) === userId) {
                return Promise.resolve(user);
            }
        }

        // Create a deferred promise that will be resolved when the user is added
        const deferred = new Deferred<SpaceUserExtended>();

        // Subscribe to user joined events to resolve the promise when the user is found
        const subscription = this.observeUserJoined.subscribe((user) => {
            if (this.getUserIdFromSpaceUserId(user.spaceUserId) === userId) {
                deferred.resolve(user);
                subscription.unsubscribe();
            }
        });

        // Return a promise that either resolves with the user or rejects after a timeout
        return Promise.race([
            deferred.promise,
            new Promise<SpaceUserExtended>((resolve, reject) => {
                setTimeout(() => {
                    subscription.unsubscribe();
                    reject(new Error("Timeout waiting for user data"));
                }, 5000);
            }),
        ]);
    }

    //TODO : revoir le nom de la fonction
    private getUserIdFromSpaceUserId(spaceUserId: string): number | undefined {
        const parts = spaceUserId.split("_");
        const lastPart = parts[parts.length - 1];
        const num = Number(lastPart);
        return isNaN(num) ? undefined : num;
    }
}
