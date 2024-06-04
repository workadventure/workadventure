import { describe, expect, it } from "vitest";
import { LocalSpaceProvider } from "../SpaceProvider/SpaceStore";
import { SpaceInterface } from "../SpaceInterface";
import { SpaceProviderInterface } from "../SpaceProvider/SpacerProviderInterface";
import { SpaceAlreadyExistError, SpaceDoesNotExistError } from "../Errors/SpaceError";

describe("SpaceProviderInterface implementation", () => {
    describe("SpaceStore", () => {
        describe("SpaceStore Add", () => {
            it("should add a space when ...", () => {
                const newSpace: Pick<SpaceInterface, "getName"> = {
                    getName(): string {
                        return "space-test";
                    },
                };

                const spaceStore: SpaceProviderInterface = new LocalSpaceProvider();
                spaceStore.add(newSpace.getName());
                expect(spaceStore.getAll()).toContain(newSpace);
            });
            it("should return a error when you try to add a space who already exist", () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                } as SpaceInterface;

                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [newSpace.getName(), newSpace],
                ]);

                const spaceStore: SpaceProviderInterface = new LocalSpaceProvider(undefined, spaceMap);
                expect(() => {
                    spaceStore.add(newSpace.getName());
                }).toThrow(SpaceAlreadyExistError);
            });
        });
        describe("SpaceStore exist", () => {
            it("should return true when space is in store", () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                } as SpaceInterface;

                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [newSpace.getName(), newSpace],
                ]);

                const spaceStore: SpaceProviderInterface = new LocalSpaceProvider(undefined, spaceMap);

                const result: boolean = spaceStore.exist(newSpace.getName());

                expect(result).toBeTruthy();
            });
            it("should return false when space is in store", () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                } as SpaceInterface;
                const spaceStore: SpaceProviderInterface = new LocalSpaceProvider();
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
                } as SpaceInterface;

                const space1: SpaceInterface = {
                    getName(): string {
                        return "space-test1";
                    },
                } as SpaceInterface;

                const space2: SpaceInterface = {
                    getName(): string {
                        return "space-test2";
                    },
                } as SpaceInterface;
                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [spaceToDelete.getName(), spaceToDelete],
                    [space1.getName(), space1],
                    [space2.getName(), space2],
                ]);

                const spaceStore: SpaceProviderInterface = new LocalSpaceProvider(undefined, spaceMap);

                spaceStore.delete(spaceToDelete.getName());
                expect(spaceStore.getAll()).not.toContain(spaceToDelete);
            });
            it("should return a error when you try to delete a space who is not in the space ", () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                } as SpaceInterface;
                const spaceStore: SpaceProviderInterface = new LocalSpaceProvider();

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
                } as SpaceInterface;

                const space2: SpaceInterface = {
                    getName(): string {
                        return "space-test2";
                    },
                } as SpaceInterface;

                const space3: SpaceInterface = {
                    getName(): string {
                        return "space-to-delete";
                    },
                } as SpaceInterface;

                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [space3.getName(), space3],
                    [space1.getName(), space1],
                    [space2.getName(), space2],
                ]);

                const spaceStore: SpaceProviderInterface = new LocalSpaceProvider(undefined, spaceMap);

                expect(spaceStore.getAll()).toContain(space1);
                expect(spaceStore.getAll()).toContain(space3);
                expect(spaceStore.getAll()).toContain(space3);
            });
        });
    });
});
