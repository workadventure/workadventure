import { describe, expect, it } from "vitest";
import { get } from "svelte/store";
import { SpaceUser } from "@workadventure/messages";
import { createSpaceStore } from "../SpaceProvider/SpaceStore";
import { SpaceInterface } from "../SpaceInterface";
import { SpaceProviderInterface } from "../SpaceProvider/SpacerProviderInterface";
import {
    SpaceAlreadyExistError,
    SpaceDoesNotExistError,
    UserAlreadyExistInSpaceError,
    UserDoesNotExistInSpaceError,
} from "../Errors/SpaceError";

describe("SpaceProviderInterface implementation", () => {
    describe("SpaceStore", () => {
        describe("SpaceStore Add", () => {
            it("should add a space when ...", () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                };

                const spaceStore: SpaceProviderInterface = createSpaceStore();
                spaceStore.add(newSpace);
                expect(get(spaceStore)).toContain(newSpace);
            });
            it("should return a error when you try to add a space who already exist", () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                };

                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [newSpace.getName(), newSpace],
                ]);

                const spaceStore: SpaceProviderInterface = createSpaceStore(spaceMap);
                expect(() => {
                    spaceStore.add(newSpace);
                }).toThrow(SpaceAlreadyExistError);
            });
        });
        describe("SpaceStore exist", () => {
            it("should return true when space is in store", () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                };

                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [newSpace.getName(), newSpace],
                ]);

                const spaceStore: SpaceProviderInterface = createSpaceStore(spaceMap);

                const result: boolean = spaceStore.exist(newSpace.getName());

                expect(result).toBeTruthy();
            });
            it("should return false when space is in store", () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                };
                const spaceStore: SpaceProviderInterface = createSpaceStore();
                const result: boolean = spaceStore.exist(newSpace.getName());
                expect(result).toBeFalsy();
            });
        });
        describe("SpaceStore delete", () => {
            it("should delete a space when space is in the store", () => {
                const spaceToDelete: SpaceInterface = {
                    getName(): string {
                        return "space-to-delete";
                    },
                };

                const space1: SpaceInterface = {
                    getName(): string {
                        return "space-test1";
                    },
                };

                const space2: SpaceInterface = {
                    getName(): string {
                        return "space-test2";
                    },
                };
                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [spaceToDelete.getName(), spaceToDelete],
                    [space1.getName(), space1],
                    [space2.getName(), space2],
                ]);

                const spaceStore: SpaceProviderInterface = createSpaceStore(spaceMap);

                spaceStore.delete(spaceToDelete.getName());
                expect(get(spaceStore)).not.toContain(spaceToDelete);
            });
            it("should return a error when you try to delete a space who is not in the space ", () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                };
                const spaceStore: SpaceProviderInterface = createSpaceStore();

                expect(() => {
                    spaceStore.delete(newSpace.getName());
                }).toThrow(SpaceDoesNotExistError);
            });
        });
        describe("SpaceStore getAll", () => {
            it("should delete a space when space is in the store", () => {
                const space1: SpaceInterface = {
                    getName(): string {
                        return "space-test1";
                    },
                };

                const space2: SpaceInterface = {
                    getName(): string {
                        return "space-test2";
                    },
                };

                const space3: SpaceInterface = {
                    getName(): string {
                        return "space-to-delete";
                    },
                };
                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [space3.getName(), space3],
                    [space1.getName(), space1],
                    [space2.getName(), space2],
                ]);

                const spaceStore: SpaceProviderInterface = createSpaceStore(spaceMap);

                expect(spaceStore.getAll()).toContain(space1);
                expect(spaceStore.getAll()).toContain(space3);
                expect(spaceStore.getAll()).toContain(space3);
            });
        });
        describe("SpaceStore UpdateMetadata", () => {
            it("should return a error when you want to update metadata of a space who does not exist", () => {
                const space: SpaceInterface = {
                    metadata: "",
                    getName(): string {
                        return "space-test";
                    },
                    getMetadata(): string {
                        return this.metadata;
                    },
                    setMetadata(metadata: string): void {
                        this.metadata = metadata;
                    },
                };

                const newMetadata = "my-new-metadata";

                const spaceStore: SpaceProviderInterface = createSpaceStore();

                expect(() => {
                    spaceStore.updateMetadata(space.getName(), newMetadata);
                }).toThrow(SpaceDoesNotExistError);
            });
            it("should update metadata of the space who is in store", () => {
                const setMetadataWatcher = vi.fn();
                const space: SpaceInterface = {
                    metadata: "",
                    getName(): string {
                        return "space-test";
                    },
                    getMetadata(): string {
                        return this.metadata;
                    },
                    setMetadata(metadata: string): void {
                        this.metadata = metadata;
                        setMetadataWatcher();
                    },
                };

                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [space.getName(), space],
                ]);

                const newMetadata = "my-new-metadata";

                const spaceStore: SpaceProviderInterface = createSpaceStore(spaceMap);

                spaceStore.updateMetadata(space.getName(), newMetadata);
                const actualSpace = spaceStore.get(space.getName());
                expect(actualSpace.getMetadata()).toBe(newMetadata);
                expect(setMetadataWatcher).toHaveBeenCalledOnce();
            });
        });
        describe("SpaceStore addUserToSpace", () => {
            it("should add a user in a specific space", () => {
                const addUserWatcher = vi.fn();
                const space1: SpaceInterface = {
                    metadata: "",
                    users: [],
                    getName(): string {
                        return "space-test1";
                    },
                    getMetadata(): string {
                        return this.metadata;
                    },
                    setMetadata(metadata: string): void {
                        this.metadata = metadata;
                    },
                    getUsers(): SpaceUser[] {
                        return this.users;
                    },
                    addUser(user: SpaceUser): void {
                        this.users.push(user);
                        addUserWatcher(user);
                    },
                };

                const space2: SpaceInterface = {
                    metadata: "",
                    users: [],
                    getName(): string {
                        return "space-test2";
                    },
                    getMetadata(): string {
                        return this.metadata;
                    },
                    setMetadata(metadata: string): void {
                        this.metadata = metadata;
                    },
                    getUsers(): SpaceUser[] {
                        return this.users;
                    },
                    addUser(user: SpaceUser): void {
                        this.users.push(user);
                    },
                };

                const user: SpaceUser = {};

                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [space1.getName(), space1],
                    [space2.getName(), space2],
                ]);

                const spaceStore: SpaceProviderInterface = createSpaceStore(spaceMap);

                spaceStore.addUserToSpace(space1.getName(), user);

                expect(space1.getUsers()).toContain(user);
                expect(addUserWatcher).toHaveBeenCalledOnce();
                expect(addUserWatcher).toHaveBeenCalledWith(user);

                expect(space2.getUsers()).not.toContain(user);
            });
            it("should return a error when you want to update metadata of a space who does not exist", () => {
                const space1: SpaceInterface = {
                    metadata: "",
                    users: [],
                    getName(): string {
                        return "space-test1";
                    },
                    getMetadata(): string {
                        return this.metadata;
                    },
                    setMetadata(metadata: string): void {
                        this.metadata = metadata;
                    },
                    getUsers(): SpaceUser[] {
                        return this.users;
                    },
                    addUser(user: SpaceUser): void {
                        this.users.push(user);
                    },
                };

                const user: SpaceUser = {};

                const spaceStore: SpaceProviderInterface = createSpaceStore();

                expect(() => {
                    spaceStore.addUserToSpace(space1.getName(), user);
                }).toThrow(SpaceDoesNotExistError);
            });
            it("should return a error when you want to add a user who is already in space", () => {
                const user: SpaceUser = {
                    id: 0,
                    name: "user1-name",
                };

                const space1: SpaceInterface = {
                    metadata: "",
                    users: [user],
                    getName(): string {
                        return "space-test1";
                    },
                    getMetadata(): string {
                        return this.metadata;
                    },
                    setMetadata(metadata: string): void {
                        this.metadata = metadata;
                    },
                    getUsers(): SpaceUser[] {
                        return this.users;
                    },
                    addUser(user: SpaceUser): void {
                        this.users.push(user);
                    },
                };

                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [space1.getName(), space1],
                ]);

                const spaceStore: SpaceProviderInterface = createSpaceStore(spaceMap);

                expect(() => {
                    spaceStore.addUserToSpace(space1.getName(), user);
                }).toThrow(UserAlreadyExistInSpaceError);
            });
        });
        describe("SpaceStore userExistInSpace", () => {
            it("should return true when user is space user list", () => {
                const user: SpaceUser = {
                    id: 0,
                };
                const space1: SpaceInterface = {
                    metadata: "",
                    users: [user],
                    getName(): string {
                        return "space-test1";
                    },
                    getMetadata(): string {
                        return this.metadata;
                    },
                    setMetadata(metadata: string): void {
                        this.metadata = metadata;
                    },
                    getUsers(): SpaceUser[] {
                        return this.users;
                    },
                    addUser(user: SpaceUser): void {
                        this.users.push(user);
                    },
                };

                const space2: SpaceInterface = {
                    metadata: "",
                    users: [],
                    getName(): string {
                        return "space-test2";
                    },
                    getMetadata(): string {
                        return this.metadata;
                    },
                    setMetadata(metadata: string): void {
                        this.metadata = metadata;
                    },
                    getUsers(): SpaceUser[] {
                        return this.users;
                    },
                    addUser(user: SpaceUser): void {
                        this.users.push(user);
                    },
                };

                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [space1.getName(), space1],
                    [space2.getName(), space2],
                ]);

                const spaceStore: SpaceProviderInterface = createSpaceStore(spaceMap);

                expect(spaceStore.userExistInSpace(user, space1.getName())).toBeTruthy();
                expect(spaceStore.userExistInSpace(user, space2.getName())).toBeFalsy();
            });
            it("should return false when user is not in space user list", () => {
                const user: SpaceUser = {
                    id: 0,
                };

                const space1: SpaceInterface = {
                    metadata: "",
                    users: [],
                    getName(): string {
                        return "space-test1";
                    },
                    getMetadata(): string {
                        return this.metadata;
                    },
                    setMetadata(metadata: string): void {
                        this.metadata = metadata;
                    },
                    getUsers(): SpaceUser[] {
                        return this.users;
                    },
                    addUser(user: SpaceUser): void {
                        this.users.push(user);
                    },
                };

                const space2: SpaceInterface = {
                    metadata: "",
                    users: [],
                    getName(): string {
                        return "space-test2";
                    },
                    getMetadata(): string {
                        return this.metadata;
                    },
                    setMetadata(metadata: string): void {
                        this.metadata = metadata;
                    },
                    getUsers(): SpaceUser[] {
                        return this.users;
                    },
                    addUser(user: SpaceUser): void {
                        this.users.push(user);
                    },
                };

                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [space1.getName(), space1],
                    [space2.getName(), space2],
                ]);

                const spaceStore: SpaceProviderInterface = createSpaceStore(spaceMap);

                expect(spaceStore.userExistInSpace(user, space1.getName())).toBeFalsy();
                expect(spaceStore.userExistInSpace(user, space2.getName())).toBeFalsy();
            });
            it("should return a error when you want to know if a user is in a space who does not exist", () => {
                const space1: SpaceInterface = {
                    metadata: "",
                    users: [],
                    getName(): string {
                        return "space-test1";
                    },
                    getMetadata(): string {
                        return this.metadata;
                    },
                    setMetadata(metadata: string): void {
                        this.metadata = metadata;
                    },
                    getUsers(): SpaceUser[] {
                        return this.users;
                    },
                    addUser(user: SpaceUser): void {
                        this.users.push(user);
                    },
                };

                const user: SpaceUser = {};

                const spaceStore: SpaceProviderInterface = createSpaceStore();

                expect(() => {
                    spaceStore.addUserToSpace(space1.getName(), user);
                }).toThrow(SpaceDoesNotExistError);
            });
        });
        describe("SpaceStore removeUserToSpace", () => {
            it("should remove user to a specific space when user is in this space", () => {
                const removeUserWatch = vi.fn();
                const user: SpaceUser = {
                    id: 0,
                };
                const space1: SpaceInterface = {
                    metadata: "",
                    users: [user],
                    getName(): string {
                        return "space-test1";
                    },
                    getMetadata(): string {
                        return this.metadata;
                    },
                    setMetadata(metadata: string): void {
                        this.metadata = metadata;
                    },
                    getUsers(): SpaceUser[] {
                        return this.users;
                    },
                    addUser(user: SpaceUser): void {
                        this.users.push(user);
                    },
                    removeUser(user: SpaceUser) {
                        this.users = this.users.filter((userInSpace) => !userInSpace.id === user.id);
                        removeUserWatch();
                    },
                };

                const space2: SpaceInterface = {
                    metadata: "",
                    users: [user],
                    getName(): string {
                        return "space-test2";
                    },
                    getMetadata(): string {
                        return this.metadata;
                    },
                    setMetadata(metadata: string): void {
                        this.metadata = metadata;
                    },
                    getUsers(): SpaceUser[] {
                        return this.users;
                    },
                    addUser(user: SpaceUser): void {
                        this.users.push(user);
                    },
                    removeUser(user: SpaceUser) {
                        this.users = this.users.filter((userInSpace) => !userInSpace.id === user.id);
                    },
                };

                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [space1.getName(), space1],
                    [space2.getName(), space2],
                ]);

                const spaceStore: SpaceProviderInterface = createSpaceStore(spaceMap);

                spaceStore.removeUserToSpace(space1.getName(), user);

                expect(spaceStore.userExistInSpace(user, space1.getName())).toBeFalsy();
                expect(removeUserWatch).toHaveBeenCalledOnce();
                expect(spaceStore.userExistInSpace(user, space2.getName())).toBeTruthy();
            });
            it("should return a error when you want to remove a user in a space who does not exist ", () => {
                const space1: SpaceInterface = {
                    metadata: "",
                    users: [],
                    getName(): string {
                        return "space-test1";
                    },
                    getMetadata(): string {
                        return this.metadata;
                    },
                    setMetadata(metadata: string): void {
                        this.metadata = metadata;
                    },
                    getUsers(): SpaceUser[] {
                        return this.users;
                    },
                    addUser(user: SpaceUser): void {
                        this.users.push(user);
                    },
                };

                const user: SpaceUser = {};

                const spaceStore: SpaceProviderInterface = createSpaceStore();

                expect(() => {
                    spaceStore.removeUserToSpace(space1.getName(), user);
                }).toThrow(SpaceDoesNotExistError);
            });
            it("should return a error when you want to remove a user in a space but user is not in this space ", () => {
                const space1: SpaceInterface = {
                    metadata: "",
                    users: [],
                    getName(): string {
                        return "space-test1";
                    },
                    getMetadata(): string {
                        return this.metadata;
                    },
                    setMetadata(metadata: string): void {
                        this.metadata = metadata;
                    },
                    getUsers(): SpaceUser[] {
                        return this.users;
                    },
                    addUser(user: SpaceUser): void {
                        this.users.push(user);
                    },
                };

                const user: SpaceUser = {};

                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [space1.getName(), space1],
                ]);

                const spaceStore: SpaceProviderInterface = createSpaceStore(spaceMap);

                expect(() => {
                    spaceStore.removeUserToSpace(space1.getName(), user);
                }).toThrow(UserDoesNotExistInSpaceError);
            });
        });

        describe("SpaceStore UpdateUserData", () => {
            it("should update userData", () => {
                const getUserWatcher = vi.fn();
                let user: SpaceUser = {
                    id: 0,
                };

                const newData: Required<SpaceUser, "id"> = {
                    id: 0,
                    name: "new-name",
                    availabilityStatus: 1,
                };

                const space1: SpaceInterface = {
                    metadata: "",
                    users: [user],
                    getName(): string {
                        return "space-test1";
                    },
                    getMetadata(): string {
                        return this.metadata;
                    },
                    setMetadata(metadata: string): void {
                        this.metadata = metadata;
                    },
                    getUsers(): SpaceUser[] {
                        return this.users;
                    },
                    addUser(user: SpaceUser): void {
                        this.users.push(user);
                    },
                    removeUser(user: SpaceUser) {
                        this.users = this.users.filter((userInSpace) => !userInSpace.id === user.id);
                    },
                    getUser(id: number): SpaceUser {
                        getUserWatcher();
                        return this.users[0];
                    },
                    updateUserData: vi.fn((newData) => {
                        user = {
                            ...user,
                            ...newData,
                        };
                        this.users = [user];
                    }),
                };

                const space2: SpaceInterface = {
                    metadata: "",
                    users: [user],
                    getName(): string {
                        return "space-test2";
                    },
                    getMetadata(): string {
                        return this.metadata;
                    },
                    setMetadata(metadata: string): void {
                        this.metadata = metadata;
                    },
                    getUsers(): SpaceUser[] {
                        return this.users;
                    },
                    addUser(user: SpaceUser): void {
                        this.users.push(user);
                    },
                    removeUser(user: SpaceUser) {
                        this.users = this.users.filter((userInSpace) => !userInSpace.id === user.id);
                    },
                    getUser(id: number): SpaceUser {
                        return this.users[0];
                    },
                    updateUserData: vi.fn((newData) => {
                        user = {
                            ...user,
                            ...newData,
                        };
                        this.users = [user];
                    }),
                };

                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [space1.getName(), space1],
                    [space2.getName(), space2],
                ]);

                const spaceStore: SpaceProviderInterface = createSpaceStore(spaceMap);

                spaceStore.updateUserData(space1.getName(), newData);

                // eslint-disable-next-line @typescript-eslint/unbound-method
                expect(space1.updateUserData).toHaveBeenCalledOnce();
                // eslint-disable-next-line @typescript-eslint/unbound-method
                expect(space1.updateUserData).toHaveBeenCalledWith({
                    ...user,
                    ...newData,
                });

                expect(getUserWatcher).toHaveBeenCalledOnce();

                expect(user).toStrictEqual({
                    ...user,
                    ...newData,
                });
            });
            it("should return a error when you want to update data of a user in a space who does not exist ", () => {
                const user: SpaceUser = {};
                const space1: SpaceInterface = {
                    metadata: "",
                    users: [user],
                    getName(): string {
                        return "space-test1";
                    },
                    getMetadata(): string {
                        return this.metadata;
                    },
                    setMetadata(metadata: string): void {
                        this.metadata = metadata;
                    },
                    getUsers(): SpaceUser[] {
                        return this.users;
                    },
                    addUser(user: SpaceUser): void {
                        this.users.push(user);
                    },
                    removeUser(user: SpaceUser) {
                        this.users = this.users.filter((userInSpace) => !userInSpace.id === user.id);
                    },
                    getUser(id: number): SpaceUser {
                        getUserWatcher();
                        return this.users[0];
                    },
                    updateUserData: vi.fn((newData) => {
                        user = {
                            ...user,
                            ...newData,
                        };
                        this.users = [user];
                    }),
                };

                const spaceStore: SpaceProviderInterface = createSpaceStore();

                expect(() => {
                    spaceStore.updateUserData(space1.getName(), user);
                }).toThrow(SpaceDoesNotExistError);
            });
            it("should return a error when you want to update a user in a space but user is not in this space ", () => {
                const user: SpaceUser = {
                    id: 0,
                };
                const space1: SpaceInterface = {
                    metadata: "",
                    users: [],
                    getName(): string {
                        return "space-test1";
                    },
                    getMetadata(): string {
                        return this.metadata;
                    },
                    setMetadata(metadata: string): void {
                        this.metadata = metadata;
                    },
                    getUsers(): SpaceUser[] {
                        return this.users;
                    },
                    addUser(user: SpaceUser): void {
                        this.users.push(user);
                    },
                    removeUser(user: SpaceUser) {
                        this.users = this.users.filter((userInSpace) => !userInSpace.id === user.id);
                    },
                    getUser(id: number): SpaceUser {
                        getUserWatcher();
                        return this.users[0];
                    },
                    updateUserData: vi.fn((newData) => {
                        user = {
                            ...user,
                            ...newData,
                        };
                        this.users = [user];
                    }),
                };

                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [space1.getName(), space1],
                ]);

                const spaceStore: SpaceProviderInterface = createSpaceStore(spaceMap);

                expect(() => {
                    spaceStore.updateUserData(space1.getName(), user);
                }).toThrow(UserDoesNotExistInSpaceError);
            });
        });
    });
});
