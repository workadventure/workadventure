import { Observable, Subject } from "rxjs";
import { PrivateSpaceEvent, SpaceEvent, SpaceUser, UpdateSpaceMetadataMessage } from "@workadventure/messages";
import { SpaceFilterInterface } from "./SpaceFilter/SpaceFilter";
import { AllUsersSpaceFilterInterface } from "./SpaceFilter/AllUsersSpaceFilter";

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
    emitUpdateUser(spaceUser: SpaceUserUpdate): void;
    emitUpdateSpaceMetadata(metadata: Map<string, unknown>): void;
    watchSpaceMetadata(): Observable<UpdateSpaceMetadataMessage>;
    readonly onLeaveSpace: Observable<void>;
}
