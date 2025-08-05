import { Observable, Subject } from "rxjs";
import {
    FilterType,
    PrivateSpaceEvent,
    SpaceEvent,
    SpaceUser,
    UpdateSpaceMetadataMessage,
} from "@workadventure/messages";
import { MapStore } from "@workadventure/store-utils";
import { Readable } from "svelte/store";
import { ExtendedStreamable } from "../Stores/StreamableCollectionStore";
import { ScreenSharingPeer } from "../WebRtc/ScreenSharingPeer";
import { RemotePlayerData } from "../Phaser/Game/RemotePlayersRepository";
import { VideoPeer } from "../WebRtc/VideoPeer";
import { SimplePeerConnectionInterface, SpacePeerManager } from "./SpacePeerManager/SpacePeerManager";

export type PublicSpaceEvent = NonNullable<SpaceEvent["event"]>;

export type PublicEventsObservables = {
    [K in PublicSpaceEvent["$case"]]?: Subject<
        Extract<PublicSpaceEvent, { $case: K }> & { spaceName: string; sender: string }
    >;
};

export type InnerPrivateSpaceEvent = NonNullable<PrivateSpaceEvent["event"]>;

export type PrivateEvents = {
    [K in InnerPrivateSpaceEvent["$case"]]: Extract<InnerPrivateSpaceEvent, { $case: K }> & {
        spaceName: string;
        sender: string;
    };
};

export type PrivateEventsObservables = {
    [K in InnerPrivateSpaceEvent["$case"]]?: Subject<
        Extract<InnerPrivateSpaceEvent, { $case: K }> & { spaceName: string; sender: SpaceUserExtended }
    >;
};

export type SpaceUserUpdate = Omit<Partial<SpaceUser>, "id">;

export interface UpdateSpaceUserEvent {
    newUser: SpaceUserExtended;
    changes: Partial<SpaceUser>;
    updateMask: string[];
}

export interface SpaceInterface {
    getName(): string;
    setMetadata(metadata: Map<string, unknown>): void;
    getMetadata(): Map<string, unknown>;
    //stopWatching(spaceFilter: SpaceFilterInterface): void;
    observePublicEvent<K extends keyof PublicEventsObservables>(key: K): NonNullable<PublicEventsObservables[K]>;
    observePrivateEvent<K extends keyof PrivateEventsObservables>(key: K): NonNullable<PrivateEventsObservables[K]>;
    emitPublicMessage(message: NonNullable<SpaceEvent["event"]>): void;
    emitPrivateMessage(
        message: NonNullable<PrivateSpaceEvent["event"]>,
        receiverUserId: SpaceUser["spaceUserId"]
    ): void;
    emitUpdateUser(spaceUser: SpaceUserUpdate): void;
    emitUpdateSpaceMetadata(metadata: Map<string, unknown>): void;
    watchSpaceMetadata(): Observable<UpdateSpaceMetadataMessage>;
    requestFullSync(): void;
    videoStreamStore: Readable<Map<string, ExtendedStreamable>>;
    screenShareStreamStore: Readable<Map<string, ExtendedStreamable>>;

    //TODO : faire une interface pour les personnes qui utilisent les stream en interne ?
    allVideoStreamStore: MapStore<string, ExtendedStreamable>;
    allScreenShareStreamStore: MapStore<string, ExtendedStreamable>;

    getSpaceUserBySpaceUserId(id: SpaceUser["spaceUserId"]): Promise<SpaceUserExtended | undefined>;
    getSpaceUserByUserId(id: number): Promise<SpaceUserExtended | undefined>;
    extendSpaceUser(user: SpaceUser): Promise<SpaceUserExtended>;
    simplePeer: SimplePeerConnectionInterface | undefined;
    readonly onLeaveSpace: Observable<void>;
    //TODO : voir si on a une meilleur maniere de faire pour avoir le spacefilter coté peer pour chercher les users
    get spacePeerManager(): SpacePeerManager;
    dispatchSound(url: URL): Promise<void>;
    //userExist(userId: number): boolean;
    //addUser(user: SpaceUser): Promise<SpaceUserExtended>;
    readonly usersStore: Readable<Map<string, SpaceUserExtended>>;
    //removeUser(userId: number): void;
    //updateUserData(userdata: Partial<SpaceUser>): void;

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
    /**
     * Use this observer to get a description of users who have been updated.
     * It can be easier than subscribing to every single property of every single user.
     */
    readonly observeUserUpdated: Observable<UpdateSpaceUserEvent>;
    readonly filterType: FilterType;
}

export type ReactiveSpaceUser = {
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
    getPlayer: () => Promise<RemotePlayerData> | undefined;
    userId: number;
};
