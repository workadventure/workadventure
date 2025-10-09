import { FilterType } from "@workadventure/messages";
import { Readable } from "svelte/store";
import { SpaceInterface } from "../SpaceInterface";
import { VideoBox } from "../Space";
export interface SpaceRegistryInterface {
    getAll(): SpaceInterface[];
    get(spaceName: string): SpaceInterface;
    joinSpace(
        spaceName: string,
        filterType: FilterType,
        propertiesToSync: string[],
        metadata?: Map<string, unknown>,
        options?: { signal: AbortSignal }
    ): Promise<SpaceInterface>;
    exist(spaceName: string): boolean;
    leaveSpace(space: SpaceInterface): Promise<void>;
    destroy(): Promise<void>;
    videoStreamStore: Readable<Map<string, VideoBox>>;
    screenShareStreamStore: Readable<Map<string, VideoBox>>;
    readonly isLiveStreamingStore: Readable<boolean>;
}
