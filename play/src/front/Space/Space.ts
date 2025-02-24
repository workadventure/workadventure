import { Observable, Subject } from "rxjs";
import {
    PrivateEvent,
    PrivateSpaceEvent,
    PublicEvent,
    SpaceEvent,
    UpdateSpaceMetadataMessage,
} from "@workadventure/messages";
import { derived, Readable, Unsubscriber } from "svelte/store";
import { MapStore } from "@workadventure/store-utils";
import { SimplePeer } from "../WebRtc/SimplePeer";
import { gameManager } from "../Phaser/Game/GameManager";
import { VideoPeer } from "../WebRtc/VideoPeer";
import { requestedCameraState, requestedMicrophoneState } from "../Stores/MediaStore";
import { requestedScreenSharingState } from "../Stores/ScreenSharingStore";
import { ScreenSharingPeer } from "../WebRtc/ScreenSharingPeer";
import { PrivateEventsObservables, PublicEventsObservables, SpaceInterface, SpaceUserUpdate } from "./SpaceInterface";
import { SpaceNameIsEmptyError } from "./Errors/SpaceError";
import { SpaceFilter, SpaceFilterInterface } from "./SpaceFilter/SpaceFilter";
import { AllUsersSpaceFilter, AllUsersSpaceFilterInterface } from "./SpaceFilter/AllUsersSpaceFilter";
import { LiveStreamingUsersSpaceFilter } from "./SpaceFilter/LiveStreamingUsersSpaceFilter";
import { RoomConnectionForSpacesInterface } from "./SpaceRegistry/SpaceRegistry";

// -------------------- Interfaces --------------------

export interface SimplePeerConnectionInterface {
    closeAllConnections(): void;
    blockedFromRemotePlayer(userId: number): void;
    setSpaceFilter(filter: SpaceFilterInterface): void;
    unregister(): void;
    dispatchStream(mediaStream: MediaStream): void;
    videoPeerAdded: Observable<VideoPeer>;
    videoPeerRemoved: Observable<VideoPeer>;
    peerStore: MapStore<number, VideoPeer>;
    screenSharingPeerStore: MapStore<number, ScreenSharingPeer>;
    cleanupStore(): void;
    removePeer(userId: number): void;
}

export interface PeerFactoryInterface {
    create(space: SpaceInterface): SimplePeerConnectionInterface;
}

export interface PeerConnectionInterface {
    destroy(): void;
}
export interface PeerStoreInterface {
    getSpaceStore(spaceName: string): Map<number, PeerConnectionInterface> | undefined;
    cleanupStore(spaceName: string): void;
    removePeer(userId: number, spaceName: string): void;
    getPeer(userId: number, spaceName: string): PeerConnectionInterface | undefined;
}

// -------------------- Default Implementations --------------------x

export const defaultPeerFactory: PeerFactoryInterface = {
    create: (space: SpaceInterface) => {
        const repository = gameManager.getCurrentGameScene().getRemotePlayersRepository();
        return new SimplePeer(space, repository);
    },
};

// -------------------- Peer Manager --------------------
export class SpacePeerManager {
    private _peer: SimplePeerConnectionInterface | undefined;
    private unsubscribes: Unsubscriber[] = [];

    constructor(private space: SpaceInterface, private peerFactory: PeerFactoryInterface) {}

    initialize(propertiesToSync: string[]): void {
        if (
            propertiesToSync.includes("screenSharingState") ||
            propertiesToSync.includes("cameraState") ||
            propertiesToSync.includes("microphoneState")
        ) {
            this._peer = this.peerFactory.create(this.space);

            this.synchronizeMediaState();
        }
    }

    private synchronizeMediaState(): void {
        //TODO : trouver un moyen d'enlever les dépendances de MediaStore
        this.unsubscribes.push(
            requestedMicrophoneState.subscribe((state) => {
                this.space.emitUpdateUser({
                    microphoneState: state,
                });
            })
        );
        this.unsubscribes.push(
            requestedCameraState.subscribe((state) => {
                this.space.emitUpdateUser({
                    cameraState: state,
                });
            })
        );

        this.unsubscribes.push(
            requestedScreenSharingState.subscribe((state) => {
                this.space.emitUpdateUser({
                    screenSharingState: state,
                });
            })
        );
    }

    cleanup(): void {
        this._peer?.closeAllConnections();
        this._peer?.unregister();

        this._peer?.peerStore.forEach((peer) => {
            peer.destroy();
        });
        this._peer?.cleanupStore();

        this._peer?.screenSharingPeerStore.forEach((peer) => {
            peer.destroy();
        });
        this._peer?.cleanupStore();

        for (const unsubscribe of this.unsubscribes) {
            unsubscribe();
        }
    }

    getPeer(): SimplePeerConnectionInterface | undefined {
        return this._peer;
    }
}
export class Space implements SpaceInterface {
    private readonly name: string;
    private filters: MapStore<string, SpaceFilter> = new MapStore<string, SpaceFilter>();
    private readonly publicEventsObservables: PublicEventsObservables = {};
    private readonly privateEventsObservables: PrivateEventsObservables = {};
    private filterNumber = 0;
    private _onLeaveSpace = new Subject<void>();
    public readonly onLeaveSpace = this._onLeaveSpace.asObservable();
    private peerManager: SpacePeerManager;
    /**
     * IMPORTANT: The only valid way to create a space is to use the SpaceRegistry.
     * Do not call this constructor directly.
     */
    constructor(
        name: string,
        private _metadata = new Map<string, unknown>(),
        private _connection: RoomConnectionForSpacesInterface,
        private _propertiesToSync: string[] = [],
        private _peerFactory: PeerFactoryInterface
    ) {
        if (name === "") {
            throw new SpaceNameIsEmptyError();
        }
        this.name = name;

        this.peerManager = new SpacePeerManager(this, this._peerFactory);

        this.peerManager.initialize(_propertiesToSync);

        this.userJoinSpace();

        // TODO: The public and private messages should be forwarded to a special method here from the Registry.
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

    watchAllUsers(): AllUsersSpaceFilterInterface {
        const filterName = `allUsers_${this.filterNumber}`;
        this.filterNumber += 1;
        const newFilter = new AllUsersSpaceFilter(filterName, this, this._connection);
        this.filters.set(filterName, newFilter);
        this.peerManager.getPeer()?.setSpaceFilter(newFilter);
        return newFilter;
    }

    watchLiveStreamingUsers(): SpaceFilterInterface {
        const filterName = `liveStreamingUsers_${this.filterNumber}`;
        this.filterNumber += 1;
        const newFilter = new LiveStreamingUsersSpaceFilter(filterName, this, this._connection);
        this.filters.set(filterName, newFilter);
        this.peerManager.getPeer()?.setSpaceFilter(newFilter);
        return newFilter;
    }

    getSpaceFilter(filterName: string): SpaceFilter {
        const spaceFilter = this.filters.get(filterName);
        if (!spaceFilter) {
            throw new Error(
                `Could not find spaceFilter named "${filterName}". Maybe it was destroyed just before a message was received?`
            );
        }
        return spaceFilter;
    }

    getAllPeerStores(): Readable<Map<number, VideoPeer>> {
        return derived(
            this.filters,
            ($filters, set) => {
                const allPeers: Map<number, VideoPeer> = new Map();
                const unsubscribers: Unsubscriber[] = [];

                const updateAllPeers = () => {
                    allPeers.clear();
                    unsubscribers.forEach((unsubscribe) => unsubscribe());
                    unsubscribers.length = 0;

                    $filters.forEach((filter) => {
                        const peerStore = filter.getAllPeerStores();
                        const unsubscribe = peerStore.subscribe((peers) => {
                            peers.forEach((peer, userId) => {
                                unsubscribers.push(
                                    peer.subscribe((videoPeer) => {
                                        if (videoPeer) {
                                            allPeers.set(userId, videoPeer);
                                            set(new Map(allPeers)); // Update the derived store
                                        }
                                    })
                                );
                            });
                        });
                        unsubscribers.push(unsubscribe);
                    });
                };

                // Initial update
                updateAllPeers();

                // Return a cleanup function to unsubscribe from all subscriptions
                return () => {
                    unsubscribers.forEach((unsubscribe) => unsubscribe());
                };
            },
            new Map<number, VideoPeer>() // Initial value
        );
    }

    getAllScreenSharingPeerStores(): Readable<Map<number, ScreenSharingPeer>> {
        return derived(
            this.filters,
            ($filters, set) => {
                const allPeers: Map<number, ScreenSharingPeer> = new Map();
                const unsubscribers: Unsubscriber[] = [];

                const updateAllPeers = () => {
                    allPeers.clear();
                    unsubscribers.forEach((unsubscribe) => unsubscribe());
                    unsubscribers.length = 0;

                    $filters.forEach((filter) => {
                        const peerStore = filter.getAllScreenSharingPeerStores();
                        const unsubscribe = peerStore.subscribe((peers) => {
                            peers.forEach((peer, userId) => {
                                unsubscribers.push(
                                    peer.subscribe((screenSharingPeer) => {
                                        if (screenSharingPeer) {
                                            allPeers.set(userId, screenSharingPeer);
                                            console.log("allPeers getAllScreenSharingPeerStores from space", allPeers);
                                            set(new Map(allPeers)); // Update the derived store
                                        }
                                    })
                                );
                            });
                        });
                        unsubscribers.push(unsubscribe);
                    });
                };

                // Initial update
                updateAllPeers();

                // Return a cleanup function to unsubscribe from all subscriptions
                return () => {
                    unsubscribers.forEach((unsubscribe) => unsubscribe());
                };
            },
            new Map<number, ScreenSharingPeer>() // Initial value
        );
    }
    // TODO: there is no way to cleanup a space filter (this.filters.delete is never called).
    // This is mildly an issue because it is unlikely we will need to create many filters (we have only 2 so far)
    /*stopWatching(spaceFilter: SpaceFilterInterface): void {
        const filterName = spaceFilter.getName();
        const filter = this.filters.get(filterName);
        if (!filter) throw new SpaceFilterDoesNotExistError(this.name, filterName);
        this.filters.delete(filterName);
    }*/

    private userLeaveSpace() {
        this._connection.emitLeaveSpace(this.name);
        this.peerManager.cleanup();
    }

    private userJoinSpace() {
        this._connection.emitJoinSpace(this.name, this._propertiesToSync);
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
                // We are hitting a limitation of TypeScript documented here: https://stackoverflow.com/questions/67513032/helper-function-to-un-discriminate-a-discriminated-union
                //@ts-ignore
                spaceName: message.spaceName,
                //@ts-ignore
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
                // We are hitting a limitation of TypeScript documented here: https://stackoverflow.com/questions/67513032/helper-function-to-un-discriminate-a-discriminated-union
                //@ts-ignore
                spaceName: message.spaceName,
                //@ts-ignore
                sender,
                ...spaceInnerEvent,
            });
        }
    }

    public emitPublicMessage(message: NonNullable<SpaceEvent["event"]>): void {
        this._connection.emitPublicSpaceEvent(this.name, message);
    }

    public emitPrivateMessage(message: NonNullable<PrivateSpaceEvent["event"]>, receiverUserId: number): void {
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
    destroy() {
        this.userLeaveSpace();

        for (const subscription of Object.values(this.publicEventsObservables)) {
            subscription.complete();
        }
        for (const subscription of Object.values(this.privateEventsObservables)) {
            subscription.complete();
        }
        this._onLeaveSpace.next();
        this._onLeaveSpace.complete();

        this.peerManager.cleanup();
    }

    public getSimplePeer(): SimplePeerConnectionInterface | undefined {
        return this.peerManager.getPeer();
    }
    /**
     * @returns an observable that emits the new metadata of the space when it changes.
     */
    watchSpaceMetadata(): Observable<UpdateSpaceMetadataMessage> {
        return this._connection.updateSpaceMetadataMessageStream;
    }
}
