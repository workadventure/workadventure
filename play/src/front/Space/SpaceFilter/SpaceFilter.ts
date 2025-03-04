import merge from "lodash/merge";
import { PrivateSpaceEvent, SpaceFilterMessage, SpaceUser } from "@workadventure/messages";
import { Observable, Subject, Subscriber } from "rxjs";
import { Readable, get, readable, writable, Writable, derived } from "svelte/store";
import { applyFieldMask } from "protobuf-fieldmask";
import { CharacterLayerManager } from "../../Phaser/Entity/CharacterLayerManager";
import { SpaceInterface } from "../SpaceInterface";
import { RoomConnectionForSpacesInterface } from "../SpaceRegistry/SpaceRegistry";
import { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
import { VideoPeer } from "../../WebRtc/VideoPeer";
import { Streamable } from "../../Stores/StreamableCollectionStore";

// FIXME: refactor from the standpoint of the consumer. addUser, removeUser should be removed...
export interface SpaceFilterInterface {
    readonly usersStore: Readable<Map<number, SpaceUserExtended>>;
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
    [K in keyof Omit<SpaceUser, "id">]: Readonly<Readable<SpaceUser[K]>>;
} & {
    id: number;
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
    private _setUsers: ((value: Map<number, SpaceUserExtended>) => void) | undefined;
    readonly usersStore: Readable<Map<number, Readonly<SpaceUserExtended>>>;
    private _users: Map<number, SpaceUserExtended> = new Map<number, SpaceUserExtended>();
    private isSubscribe = false;
    private _addUserSubscriber: Subscriber<SpaceUserExtended> | undefined;
    private _leftUserSubscriber: Subscriber<SpaceUserExtended> | undefined;
    public readonly observeUserJoined: Observable<SpaceUserExtended>;
    public readonly observeUserLeft: Observable<SpaceUserExtended>;
    private registerRefCount = 0;

    protected constructor(
        private _name: string,
        private _space: SpaceInterface,
        private _connection: RoomConnectionForSpacesInterface,
        private _filter: Filter
    ) {
        this.usersStore = readable(new Map<number, SpaceUserExtended>(), (set) => {
            this.registerSpaceFilter();
            this._setUsers = set;
            set(this._users);
            this.isSubscribe = true;

            return () => {
                this.unregisterSpaceFilter();
                this.isSubscribe = false;
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
    }
    async addUser(user: SpaceUser): Promise<SpaceUserExtended> {
        const extendSpaceUser = await this.extendSpaceUser(user);
        if (!this._users.has(user.id)) {
            this._users.set(user.id, extendSpaceUser);
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
    removeUser(userId: number): void {
        const user = this._users.get(userId);
        if (user) {
            this._users.delete(userId);
            if (this._setUsers) {
                this._setUsers(this._users);
            }
            if (this._leftUserSubscriber) {
                this._leftUserSubscriber.next(user);
            }
        }

        const peerConnection = this._space.videoPeerStore.get(userId);
        if (peerConnection) {
            peerConnection.destroy();
            this._space.videoPeerStore.delete(userId);
        }

        const screenSharingPeerConnection = this._space.screenSharingPeerStore.get(userId);
        if (screenSharingPeerConnection) {
            screenSharingPeerConnection.destroy();
            this._space.screenSharingPeerStore.delete(userId);
        }
    }

    updateUserData(newData: SpaceUser, updateMask: string[]): void {
        if (!newData.id && newData.id !== 0) return;

        const userToUpdate = this._users.get(newData.id);

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
                this._connection.emitPrivateSpaceEvent(this._space.getName(), message, user.id);
            },
            space: this._space,
            getPeerStore: () => {
                const peerStore = this._space.videoPeerStore;
                if (peerStore) {
                    return derived(peerStore, ($peerStore) => {
                        return $peerStore.get(user.id);
                    });
                }
                return undefined;
            },
            getLivekitVideoStreamStore: () => {
                const livekitVideoStreamStore = this._space.livekitVideoStreamStore;

                const store = derived(livekitVideoStreamStore, ($livekitVideoStreamStore) => {
                    return $livekitVideoStreamStore.get(user.id);
                });

                return store;
            },
            getLivekitScreenShareStreamStore: () => {
                const livekitScreenShareStreamStore = this._space.livekitScreenShareStreamStore;
                if (livekitScreenShareStreamStore) {
                    return derived(livekitScreenShareStreamStore, ($livekitScreenShareStreamStore) => {
                        return $livekitScreenShareStreamStore.get(user.id);
                    });
                }
                return undefined;
            },
            getScreenSharingPeerStore: () => {
                const screenSharingPeerStore = this._space.screenSharingPeerStore;
                if (screenSharingPeerStore) {
                    return derived(screenSharingPeerStore, ($screenSharingPeerStore) => {
                        return $screenSharingPeerStore.get(user.id);
                    });
                }
                return undefined;
            },
        } as unknown as SpaceUserExtended;

        extendedUser.reactiveUser = new Proxy(
            {
                id: extendedUser.id,
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
                            //@ts-ignore
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
    public getAllPeerStores(): Readable<Map<number, Readable<VideoPeer>>> {
        return derived(this.usersStore, ($usersStore) => {
            const allPeers: Map<number, Readable<VideoPeer>> = new Map();
            for (const user of $usersStore.values()) {
                const peerStore = user.getPeerStore();
                if (peerStore !== undefined) {
                    allPeers.set(user.id, peerStore);
                }
            }
            return allPeers;
        });
    }

    public getAllScreenSharingPeerStores(): Readable<Map<number, Readable<ScreenSharingPeer>>> {
        return derived(this.usersStore, ($usersStore) => {
            const allPeers: Map<number, Readable<ScreenSharingPeer>> = new Map();
            for (const user of $usersStore.values()) {
                const peerStore = user.getScreenSharingPeerStore();
                if (peerStore !== undefined) {
                    allPeers.set(user.id, peerStore);
                }
            }
            return allPeers;
        });
    }

    public getAllLivekitVideoStreamStores(): Readable<Map<number, Readable<Streamable>>> {
        return derived(this.usersStore, ($usersStore) => {
            const allPeers: Map<number, Readable<Streamable>> = new Map();
            for (const user of $usersStore.values()) {
                const peerStore = user.getLivekitVideoStreamStore();
                if (peerStore !== undefined) {
                    allPeers.set(user.id, peerStore);
                }
            }
            return allPeers;
        });
    }

    public getAllLivekitScreenShareStreamStores(): Readable<Map<number, Readable<Streamable>>> {
        return derived(this.usersStore, ($usersStore) => {
            const allPeers: Map<number, Readable<Streamable>> = new Map();
            for (const user of $usersStore.values()) {
                const peerStore = user.getLivekitScreenShareStreamStore();
                if (peerStore !== undefined) {
                    allPeers.set(user.id, peerStore);
                }
            }
            return allPeers;
        });
    }
    public getUserByUuid(uuid: string): SpaceUserExtended | undefined {
        return Array.from(this._users.values()).find((user) => user.uuid === uuid);
    }
}
