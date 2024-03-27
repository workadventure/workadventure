import { describe, expect, it, vi } from "vitest";
import { SpaceInterface } from "../SpaceInterface";
import { SpaceProviderInterface } from "../SpaceProvider/SpacerProviderInterface";
import { SpaceAlreadyExistError, SpaceDoesNotExistError } from "../Errors/SpaceError";
import { LocalSpaceProvider } from "../SpaceProvider/SpaceStore";

describe("SpaceProviderInterface implementation", () => {
    describe("SpaceStore", () => {
        describe("SpaceStore Add", () => {
            it("should add a space when ...", () => {
                const spaceName = "space-name";
                const spaceStore: SpaceProviderInterface = new LocalSpaceProvider();
                const space = spaceStore.add(spaceName);
                expect(space.getName()).toContain(spaceName);
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

                const spaceStore: SpaceProviderInterface = new LocalSpaceProvider(null, spaceMap);
                expect(() => {
                    spaceStore.add(newSpace.getName());
                }).toThrow(SpaceAlreadyExistError);
            });
        });
        describe("SpaceStore delete", () => {
            it("should delete a space when space is in the store and call is destroy function", () => {
                const spaceToDelete: SpaceInterface = {
                    getName(): string {
                        return "space-to-delete";
                    },
                    destroy: vi.fn(),
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

                const spaceStore: SpaceProviderInterface = new LocalSpaceProvider(null, spaceMap);

                spaceStore.delete(spaceToDelete.getName());

                const storeResult = spaceStore.getAll();
                expect(storeResult).not.toContain(spaceToDelete);
                expect(storeResult).toHaveLength(2);

                // eslint-disable-next-line @typescript-eslint/unbound-method
                expect(spaceToDelete.destroy).toHaveBeenCalledOnce();
            });
            it("should return a error when you try to delete a space who is not in the space ", () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                };
                const spaceStore: SpaceProviderInterface = new LocalSpaceProvider();

                expect(() => {
                    spaceStore.delete(newSpace.getName());
                }).toThrow(SpaceDoesNotExistError);
            });
        });
    });
});
