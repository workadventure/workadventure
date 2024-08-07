import { SpaceFilterInterface } from "./SpaceFilter/SpaceFilter";

export interface SpaceInterface {
    emitJitsiParticipantId(participantId: string): void;
    getName(): string;
    setMetadata(metadata: Map<string, unknown>): void;
    getMetadata(): Map<string, unknown>;
    getSpaceFilter(filterName: string): SpaceFilterInterface;
    watch(filterName: string): SpaceFilterInterface;
    stopWatching(filterName: string): void;
    spaceFilterExist(filterName: string): boolean;
}
