import { Subject } from "rxjs";
import { SpaceEvent } from "@workadventure/messages";
import { SpaceFilterInterface } from "./SpaceFilter/SpaceFilter";

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
    getSpaceFilter(filterName: string): SpaceFilterInterface;
    watch(filterName: string): SpaceFilterInterface;
    stopWatching(filterName: string): void;
    spaceFilterExist(filterName: string): boolean;
    observePublicEvent<K extends keyof PublicEventsObservables>(key: K): NonNullable<PublicEventsObservables[K]>;
}
