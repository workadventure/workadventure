import { SpaceFilterMessage, SpaceUser } from "@workadventure/messages";
import { SpaceInterface } from "../tests/SpaceManager.test";

export interface SpaceManagerInterface {
    getAll(): SpaceInterface[];
    join(spaceName: string, spaceFilter?: Omit<SpaceFilterMessage, "spaceName">): void;
    leave(spaceName: string): void;
    updateMetadata(spaceName: string, metadata: string): void;
}
export interface SpaceUserManagerInterface {
    addUserToSpace(spaceName: string, spaceUser: SpaceUser): void;
    removeUserToSpace(spaceName: string, spaceUser: SpaceUser): void;
    updateUserData(spaceName: string, spaceUser: SpaceUser): void;
}
export interface SpaceFilterManagerInterface {
    addFilterToSpace(spaceName: string, spaceFilter: Omit<SpaceFilterMessage, "spaceName">): void;
    removeFilterToSpace(spaceName: string, filterName: string): void;
    updateFilterOfSpace(spaceName: string, spaceFilter: Omit<SpaceFilterMessage, "spaceName">): void;
}
