import { Readable } from "svelte/store";
import { ExtendedStreamable } from "../../Stores/StreamableCollectionStore";
import { SpaceInterface } from "../SpaceInterface";
export interface SpaceRegistryInterface {
    getAll(): SpaceInterface[];
    get(spaceName: string): SpaceInterface;
    joinSpace(spaceName: string, propertiesToSync: string[]): SpaceInterface;
    exist(spaceName: string): boolean;
    leaveSpace(space: SpaceInterface): void;
    destroy(): void;
    videoStreamStore: Readable<Map<string, ExtendedStreamable>>;
    screenShareStreamStore: Readable<Map<string, ExtendedStreamable>>;
}
