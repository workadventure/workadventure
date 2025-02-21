import { Observable, Subject } from "rxjs";
import {
    PrivateEvent,
    PrivateSpaceEvent,
    PublicEvent,
    SpaceEvent,
    UpdateSpaceMetadataMessage,
} from "@workadventure/messages";
import { SimplePeer } from "../WebRtc/SimplePeer";
import { gameManager } from "../Phaser/Game/GameManager";
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

    constructor(
        private space: SpaceInterface,
        private peerStore: PeerStoreInterface,
        private screenSharingPeerStore: PeerStoreInterface,
        private peerFactory: PeerFactoryInterface
    ) {}

    initialize(propertiesToSync: string[]): void {
        if (
            propertiesToSync.includes("screenSharingState") ||
            propertiesToSync.includes("cameraState") ||
            propertiesToSync.includes("microphoneState")
        ) {
            this._peer = this.peerFactory.create(this.space);
        }
    }

    cleanup(): void {
        const spaceName = this.space.getName();

        this._peer?.closeAllConnections();
        this._peer?.unregister();

        this.peerStore.getSpaceStore(spaceName)?.forEach((peer) => {
            peer.destroy();
        });
        this.peerStore.cleanupStore(spaceName);

        this.screenSharingPeerStore.getSpaceStore(spaceName)?.forEach((peer) => {
            peer.destroy();
        });
        this.screenSharingPeerStore.cleanupStore(spaceName);
    }

    getPeer(): SimplePeerConnectionInterface | undefined {
        return this._peer;
    }
}
export class Space implements SpaceInterface {
    private readonly name: string;
    private filters: Map<string, SpaceFilter> = new Map<string, SpaceFilter>();
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
        private _peerFactory: PeerFactoryInterface,
        private _peerStore: PeerStoreInterface,
        private _screenSharingPeerStore: PeerStoreInterface
    ) {
        if (name === "") {
            throw new SpaceNameIsEmptyError();
        }
        this.name = name;

        this.peerManager = new SpacePeerManager(this, this._peerStore, this._screenSharingPeerStore, this._peerFactory);

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
        const newFilter = new AllUsersSpaceFilter(
            filterName,
            this,
            this._connection,
            this._peerStore,
            this._screenSharingPeerStore
        );
        this.filters.set(filterName, newFilter);
        this.peerManager.getPeer()?.setSpaceFilter(newFilter);
        return newFilter;
    }

    watchLiveStreamingUsers(): SpaceFilterInterface {
        const filterName = `liveStreamingUsers_${this.filterNumber}`;
        this.filterNumber += 1;
        const newFilter = new LiveStreamingUsersSpaceFilter(
            filterName,
            this,
            this._connection,
            this._peerStore,
            this._screenSharingPeerStore
        );
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
