import type { Observable, Subject } from "rxjs";
import type {
    FilterType,
    PrivateSpaceEvent,
    SpaceEvent,
    SpaceUser,
    UpdateSpaceMetadataMessage,
} from "@workadventure/messages";
import type { MapStore } from "@workadventure/store-utils";
import type { Readable } from "svelte/store";
import type { SimplePeerConnectionInterface, SpacePeerManager } from "./SpacePeerManager/SpacePeerManager";
import type { VideoBox } from "./Space";

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
    videoStreamStore: Readable<Map<string, VideoBox>>;
    screenShareStreamStore: Readable<Map<string, VideoBox>>;

    allVideoStreamStore: MapStore<string, VideoBox>;
    allScreenShareStreamStore: MapStore<string, VideoBox>;
    getScreenSharingPeerVideoBox(id: SpaceUser["spaceUserId"]): VideoBox | undefined;
    getVideoPeerVideoBox(id: SpaceUser["spaceUserId"]): VideoBox | undefined;

    getSpaceUserBySpaceUserId(id: SpaceUser["spaceUserId"]): SpaceUserExtended | undefined;
    getSpaceUserByUserId(id: number): SpaceUserExtended | undefined;
    getSpaceUserByUuid(uuid: string): SpaceUserExtended | undefined;
    simplePeer: SimplePeerConnectionInterface | undefined;
    readonly onLeaveSpace: Observable<void>;
    get spacePeerManager(): SpacePeerManager;
    dispatchSound(url: URL): Promise<void>;
    //userExist(userId: number): boolean;
    //addUser(user: SpaceUser): Promise<SpaceUserExtended>;
    readonly usersStore: Readable<Map<string, SpaceUserExtended>>;
    //removeUser(userId: number): void;
    //updateUserData(userdata: Partial<SpaceUser>): void;
    /**
     * Start streaming the local camera and microphone to other users in the space.
     * This will trigger an error if the filter type is ALL_USERS (because everyone is always streaming in a ALL_USERS space).
     */
    startStreaming(): void;

    /**
     * Stop streaming the local camera and microphone to other users in the space.
     * This will trigger an error if the filter type is ALL_USERS (because everyone is always streaming in a ALL_USERS space).
     */
    stopStreaming(): void;

    /**
     * This store returns true if the local user is currently streaming their camera and microphone to other users in the space.
     * In a ALL_USERS space, this store will always return true.
     * In a LIVE_STREAMING_USERS, this store will return true when the startStreaming() method has been called, and false when the stopStreaming() method has been called.
     */
    readonly isStreamingStore: Readable<boolean>;

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
    readonly observeMetadata: Observable<Map<string, unknown>>;
    readonly filterType: FilterType;
    get mySpaceUserId(): SpaceUser["spaceUserId"];
    getUsers(options?: { signal: AbortSignal }): Promise<Map<string, Readonly<SpaceUserExtended>>>;

    readonly destroyed: boolean;
}

export type ReactiveSpaceUser = {
    [K in keyof Omit<SpaceUser, "spaceUserId" | "playUri" | "roomName">]: Readonly<Readable<SpaceUser[K]>>;
} & {
    spaceUserId: string;
    playUri: string | undefined;
    roomName: string | undefined;
};

export type SpaceUserExtended = SpaceUser & {
    pictureStore: Readable<string | undefined>;
    emitPrivateEvent: (message: NonNullable<PrivateSpaceEvent["event"]>) => void;
    space: Pick<SpaceInterface, "emitPublicMessage">;
    reactiveUser: ReactiveSpaceUser;
};
