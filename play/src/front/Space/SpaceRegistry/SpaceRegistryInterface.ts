import type { FilterType } from "@workadventure/messages";
import type { Readable } from "svelte/store";
import type { SpaceInterface } from "../SpaceInterface";
import type { VideoBox } from "../Space";
export interface SpaceRegistryInterface {
    getAll(): SpaceInterface[];
    get(spaceName: string): SpaceInterface;
    joinSpace(
        spaceName: string,
        filterType: FilterType,
        propertiesToSync: string[],
        // Note: the signal is compulsory because we should always handle the case where the join is aborted
        signal: AbortSignal,
        options?: {
            metadata?: Map<string, unknown>;
        }
    ): Promise<SpaceInterface>;
    exist(spaceName: string): boolean;
    leaveSpace(space: SpaceInterface): Promise<void>;
    destroy(): Promise<void>;
    videoStreamStore: Readable<Map<string, VideoBox>>;
    screenShareStreamStore: Readable<Map<string, VideoBox>>;
    readonly isLiveStreamingStore: Readable<boolean>;
}
