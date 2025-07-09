import { FilterType } from "@workadventure/messages";
import { Readable } from "svelte/store";
import { ExtendedStreamable } from "../../Stores/StreamableCollectionStore";
import { SpaceInterface } from "../SpaceInterface";
import {Space} from "../Space";
export interface SpaceRegistryInterface {
    getAll(): SpaceInterface[];
    get(spaceName: string): SpaceInterface;
    joinSpace(spaceName: string, filterType: FilterType, propertiesToSync: string[]): Promise<SpaceInterface>;
    exist(spaceName: string): boolean;
    leaveSpace(space: SpaceInterface): Promise<void>;
    destroy(): Promise<void>;
    videoStreamStore: Readable<Map<string, ExtendedStreamable>>;
    screenShareStreamStore: Readable<Map<string, ExtendedStreamable>>;
    spacesWithRecording: Readable<Space[]>;
}
