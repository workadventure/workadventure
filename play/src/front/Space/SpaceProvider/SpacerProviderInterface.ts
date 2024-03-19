import { SpaceUser } from "@workadventure/messages";
import { Subscriber, Unsubscriber } from "svelte/store";
import { SpaceInterface } from "../SpaceInterface";
export interface SpaceProviderInterface {
    getAll(): SpaceInterface[];
    get(spaceName: string): SpaceInterface;
    addUserToSpace(spaceName: string, user: SpaceUser): void;
    removeUserToSpace(spaceName: string, user: SpaceUser): void;
    add(newSpace: SpaceInterface): void;
    exist(spaceName: string): boolean;
    delete(spaceName: string): void;
    updateMetadata(spaceName: string, metadata: string): void;
    userExistInSpace(spaceName: string, spaceUser: SpaceUser): boolean;
    updateUserData(spaceName: string, spaceUser: Required<Partial<SpaceUser>, "id">): void;
    subscribe(this: void, run: Subscriber<unknown>, invalidate?: unknown | undefined): Unsubscriber;
}
