import { writable, get } from "svelte/store";
import { SpaceUser } from "@workadventure/messages";
import { SpaceInterface } from "../SpaceInterface";
import {
    SpaceAlreadyExistError,
    SpaceDoesNotExistError,
    UserAlreadyExistInSpaceError,
    UserDoesNotExistInSpaceError,
} from "../Errors/SpaceError";
import { SpaceProviderInterface } from "./SpacerProviderInterface";

export function createSpaceStore(
    spaces: Map<string, SpaceInterface> = new Map<string, SpaceInterface>()
): SpaceProviderInterface {
    const value = writable<Map<string, SpaceInterface>>(spaces);
    const { update, subscribe } = value;

    return {
        subscribe,
        add(newSpace: SpaceInterface): void {
            update((spaceStore: Map<string, SpaceInterface>) => {
                if (this.spaceExistInStore(spaceStore, newSpace.getName()))
                    throw new SpaceAlreadyExistError(newSpace.getName());
                spaceStore.set(newSpace.getName(), newSpace);
                return spaceStore;
            });
        },
        exist(spaceName: string): boolean {
            return this.spaceExistInStore(get(value), spaceName);
        },
        spaceExistInStore(store: Map<string, SpaceInterface>, spaceName: string): boolean {
            return store.has(spaceName);
        },

        delete(spaceName: string): void {
            update((spaceStore: Map<string, SpaceInterface>) => {
                if (!this.spaceExistInStore(spaceStore, spaceName)) throw new SpaceDoesNotExistError(spaceName);
                return Array.from(get(value), ([key, value]) => ({ key, value })).reduce((storeAcc, { key, value }) => {
                    if (key === spaceName) return storeAcc;
                    storeAcc.set(key, value);
                    return storeAcc;
                }, new Map<string, SpaceInterface>());
            });
        },
        getAll(): SpaceInterface[] {
            return get(value);
        },
        get(spaceName: string): SpaceInterface {
            //verifier space exist
            return get(value).get(spaceName);
        },
        updateMetadata(spaceName: string, metadata: string): void {
            update((spaceStore: Map<string, SpaceInterface>): Map<string, SpaceInterface> => {
                if (!this.spaceExistInStore(spaceStore, spaceName)) throw new SpaceDoesNotExistError(spaceName);
                const spaceToUpdate: SpaceInterface = spaceStore.get(spaceName);
                spaceToUpdate.setMetadata(metadata);
                //spaceStore.set(spaceName,spaceToUpdate);
                return spaceStore;
            });
        },

        addUserToSpace(spaceName: string, userToAdd: SpaceUser): void {
            update((spaceStore: Map<string, SpaceInterface>): Map<string, SpaceInterface> => {
                if (!this.spaceExistInStore(spaceStore, spaceName)) throw new SpaceDoesNotExistError(spaceName);
                const spaceToUpdate: SpaceInterface = spaceStore.get(spaceName);
                if (this.userExistInSpace(userToAdd, spaceName, spaceStore))
                    throw new UserAlreadyExistInSpaceError(spaceName, userToAdd.name);
                spaceToUpdate.addUser(userToAdd);
                spaceStore.set(spaceName, spaceToUpdate);
                return spaceStore;
            });
        },
        userExistInSpace({ id: userId }: SpaceUser, spaceName, store: Map<string, SpaceInterface> = get(value)) {
            if (!this.spaceExistInStore(store, spaceName)) throw new SpaceDoesNotExistError(spaceName);
            return store
                .get(spaceName)
                .getUsers()
                .some((user: SpaceUser): boolean => userId === user.id);
        },
        removeUserToSpace(spaceName: string, user: SpaceUser): void {
            update((spaceStore: Map<string, SpaceInterface>): Map<string, SpaceInterface> => {
                if (!this.spaceExistInStore(spaceStore, spaceName)) throw new SpaceDoesNotExistError(spaceName);
                const spaceToUpdate: SpaceInterface = spaceStore.get(spaceName);
                if (!this.userExistInSpace(user, spaceName, spaceStore))
                    throw new UserDoesNotExistInSpaceError(spaceName, user.name);
                spaceToUpdate.removeUser(user);
                spaceStore.set(spaceName, spaceToUpdate);
                return spaceStore;
            });
        },

        updateUserData(spaceName: string, userData: Required<"id">): void {
            update((spaceStore: Map<string, SpaceInterface>): Map<string, SpaceInterface> => {
                if (!this.spaceExistInStore(spaceStore, spaceName)) throw new SpaceDoesNotExistError(spaceName);
                const spaceToUpdate: SpaceInterface = spaceStore.get(spaceName);
                if (!this.userExistInSpace(userData, spaceName, spaceStore))
                    throw new UserDoesNotExistInSpaceError(spaceName, userData.name || userData.id);

                let userToUpdate = spaceToUpdate.getUser(userData.id);
                userToUpdate = {
                    ...userToUpdate,
                    ...userData,
                };
                spaceToUpdate.updateUserData(userToUpdate);
                spaceStore.set(spaceName, spaceToUpdate);
                return spaceStore;
            });
        },
    };
}

export const spaceStore = createSpaceStore();
