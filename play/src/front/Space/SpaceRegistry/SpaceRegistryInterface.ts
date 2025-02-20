import { SpaceInterface } from "../SpaceInterface";
export interface SpaceRegistryInterface {
    getAll(): SpaceInterface[];
    get(spaceName: string): SpaceInterface;
    joinSpace(spaceName: string, propertiesToSync: string[]): SpaceInterface;
    exist(spaceName: string): boolean;
    leaveSpace(space: SpaceInterface): void;
    destroy(): void;
}
