import { FilterType } from "@workadventure/messages";
import { SpaceInterface } from "../SpaceInterface";
export interface SpaceRegistryInterface {
    getAll(): SpaceInterface[];
    get(spaceName: string): SpaceInterface;
    joinSpace(spaceName: string, filterType: FilterType): Promise<SpaceInterface>;
    exist(spaceName: string): boolean;
    leaveSpace(space: SpaceInterface): Promise<void>;
    destroy(): Promise<void>;
}
