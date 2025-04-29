import { Observable, Subject } from "rxjs";
import { PrivateSpaceEvent, SpaceEvent, SpaceUser, UpdateSpaceMetadataMessage } from "@workadventure/messages";
import { MapStore } from "@workadventure/store-utils";
import { VideoPeer } from "../WebRtc/VideoPeer";
import { ScreenSharingPeer } from "../WebRtc/ScreenSharingPeer";
import { Streamable } from "../Stores/StreamableCollectionStore";
import { AllUsersSpaceFilterInterface } from "./SpaceFilter/AllUsersSpaceFilter";
import { SpaceFilter, SpaceFilterInterface, SpaceUserExtended } from "./SpaceFilter/SpaceFilter";
import { SimplePeerConnectionInterface } from "./SpacePeerManager/SpacePeerManager";
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
        Extract<InnerPrivateSpaceEvent, { $case: K }> & { spaceName: string; sender: string }
    >;
};

export type SpaceUserUpdate = Omit<Partial<SpaceUser>, "id">;

export interface SpaceInterface {
    getName(): string;
    setMetadata(metadata: Map<string, unknown>): void;
    getMetadata(): Map<string, unknown>;
    watchAllUsers(): AllUsersSpaceFilterInterface;
    watchLiveStreamingUsers(): SpaceFilterInterface;
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
    videoPeerStore: MapStore<SpaceUser["spaceUserId"], VideoPeer>;
    screenSharingPeerStore: MapStore<SpaceUser["spaceUserId"], ScreenSharingPeer>;
    livekitVideoStreamStore: MapStore<SpaceUser["spaceUserId"], Streamable>;
    livekitScreenShareStreamStore: MapStore<SpaceUser["spaceUserId"], Streamable>;
    getSpaceUserBySpaceUserId(id: SpaceUser["spaceUserId"]): SpaceUserExtended | undefined;
    getSpaceUserByUserId(id: number): SpaceUserExtended | undefined;
    simplePeer: SimplePeerConnectionInterface | undefined;
    readonly onLeaveSpace: Observable<void>;
    //TODO : voir si on a une meilleur maniere de faire pour avoir le spacefilter coté peer pour chercher les users 
    getLastSpaceFilter(): SpaceFilter | undefined;
}
