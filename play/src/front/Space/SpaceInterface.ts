import { Subject } from "rxjs";
import { SpaceEvent } from "@workadventure/messages";
import { SpaceFilterInterface } from "./SpaceFilter/SpaceFilter";
import { AllUsersSpaceFilterInterface } from "./SpaceFilter/AllUsersSpaceFilter";

export type PublicSpaceEvent = NonNullable<SpaceEvent["event"]>;

export type PublicEventsObservables = {
    [K in PublicSpaceEvent["$case"]]?: Subject<
        Extract<PublicSpaceEvent, { $case: K }> & { spaceName: string; sender: number }
    >;
};

export interface SpaceInterface {
    emitJitsiParticipantId(participantId: string): void;
    getName(): string;
    setMetadata(metadata: Map<string, unknown>): void;
    getMetadata(): Map<string, unknown>;
    watchAllUsers(): AllUsersSpaceFilterInterface;
    watchLiveStreamingUsers(): SpaceFilterInterface;
    stopWatching(spaceFilter: SpaceFilterInterface): void;
    observePublicEvent<K extends keyof PublicEventsObservables>(key: K): NonNullable<PublicEventsObservables[K]>;
    emitPublicMessage(message: NonNullable<SpaceEvent["event"]>): void;
}
