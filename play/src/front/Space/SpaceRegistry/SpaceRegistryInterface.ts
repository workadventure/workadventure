import { SpaceInterface } from "../SpaceInterface";
export interface SpaceRegistryInterface {
    getAll(): SpaceInterface[];
    get(spaceName: string): SpaceInterface;
    joinSpace(spaceName: string): SpaceInterface;
    exist(spaceName: string): boolean;
    leaveSpace(spaceName: string): void;
    destroy(): void;
}
