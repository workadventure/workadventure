import { describe, expect, it, vi } from "vitest";
import { SpaceRegistry } from "../SpaceRegistry/SpaceRegistry";
import { SpaceInterface } from "../SpaceInterface";
import { SpaceRegistryInterface } from "../SpaceRegistry/SpaceRegistryInterface";
import { SpaceAlreadyExistError, SpaceDoesNotExistError } from "../Errors/SpaceError";
import { Space } from "../Space";
import { RoomConnection } from "../../Connection/RoomConnection";

vi.mock("../../Phaser/Entity/CharacterLayerManager", () => {
    return {
        CharacterLayerManager: {
            wokaBase64(): Promise<string> {
                return Promise.resolve("");
            },
        },
    };
});

vi.mock("../../Phaser/Game/GameManager", () => {
    return {
        gameManager: {
            getCurrentGameScene: () => ({}),
        },
    };
});
const defaultRoomConnectionMock = {
    emitJoinSpace: vi.fn(),
} as unknown as RoomConnection;

describe("SpaceProviderInterface implementation", () => {
    describe("SpaceRegistry", () => {
        describe("SpaceRegistry Add", () => {
            it("should add a space when ...", () => {
                const newSpace: Pick<SpaceInterface, "getName"> = {
                    getName(): string {
                        return "space-test";
                    },
                };

                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(defaultRoomConnectionMock);
                spaceRegistry.joinSpace(newSpace.getName());
                expect(spaceRegistry.get(newSpace.getName())).toBeInstanceOf(Space);
            });
            it("should return a error when you try to add a space which already exist", () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                } as SpaceInterface;

                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [newSpace.getName(), newSpace],
                ]);

                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(defaultRoomConnectionMock, spaceMap);
                expect(() => {
                    spaceRegistry.joinSpace(newSpace.getName());
                }).toThrow(SpaceAlreadyExistError);
            });
        });
        describe("SpaceRegistry exist", () => {
            it("should return true when space is in store", () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                } as SpaceInterface;

                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [newSpace.getName(), newSpace],
                ]);

                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(defaultRoomConnectionMock, spaceMap);

                const result: boolean = spaceRegistry.exist(newSpace.getName());

                expect(result).toBeTruthy();
            });
            it("should return false when space is in store", () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                } as SpaceInterface;
                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(defaultRoomConnectionMock);
                const result: boolean = spaceRegistry.exist(newSpace.getName());
                expect(result).toBeFalsy();
            });
        });
        describe("SpaceRegistry delete", () => {
            it("should delete a space when space is in the store", () => {
                const destroyMock = vi.fn();

                const spaceToDelete: SpaceInterface = {
                    getName(): string {
                        return "space-to-delete";
                    },
                    destroy: destroyMock,
                } as unknown as SpaceInterface;

                const space1: SpaceInterface = {
                    getName(): string {
                        return "space-test1";
                    },
                    destroy: destroyMock,
                } as unknown as SpaceInterface;

                const space2: SpaceInterface = {
                    getName(): string {
                        return "space-test2";
                    },
                    destroy: destroyMock,
                } as unknown as SpaceInterface;
                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [spaceToDelete.getName(), spaceToDelete],
                    [space1.getName(), space1],
                    [space2.getName(), space2],
                ]);

                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(defaultRoomConnectionMock, spaceMap);

                spaceRegistry.leaveSpace(spaceToDelete.getName());
                expect(spaceRegistry.getAll()).not.toContain(spaceToDelete);
                expect(destroyMock).toBeCalledTimes(1);
            });
            it("should return a error when you try to delete a space who is not in the space ", () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                } as SpaceInterface;
                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(defaultRoomConnectionMock);

                expect(() => {
                    spaceRegistry.leaveSpace(newSpace.getName());
                }).toThrow(SpaceDoesNotExistError);
            });
        });
        describe("SpaceRegistry getAll", () => {
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

                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(defaultRoomConnectionMock, spaceMap);

                expect(spaceRegistry.getAll()).toContain(space1);
                expect(spaceRegistry.getAll()).toContain(space3);
                expect(spaceRegistry.getAll()).toContain(space3);
            });
        });
        describe("SpaceRegistry destroy", () => {
            it("should destroy space store", () => {
                const space1: SpaceInterface = {
                    getName(): string {
                        return "space-test1";
                    },
                    destroy: vi.fn(),
                } as unknown as SpaceInterface;

                const space2: SpaceInterface = {
                    getName(): string {
                        return "space-test2";
                    },
                    destroy: vi.fn(),
                } as unknown as SpaceInterface;

                const space3: SpaceInterface = {
                    getName(): string {
                        return "space-to-delete";
                    },
                    destroy: vi.fn(),
                } as unknown as SpaceInterface;

                const spaceMap: Map<string, SpaceInterface> = new Map<string, SpaceInterface>([
                    [space3.getName(), space3],
                    [space1.getName(), space1],
                    [space2.getName(), space2],
                ]);
                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(defaultRoomConnectionMock, spaceMap);
                spaceRegistry.destroy();
                expect(spaceRegistry.getAll()).toHaveLength(0);
                // eslint-disable-next-line @typescript-eslint/unbound-method
                expect(space1.destroy).toHaveBeenCalledOnce();
                // eslint-disable-next-line @typescript-eslint/unbound-method
                expect(space2.destroy).toHaveBeenCalledOnce();
                // eslint-disable-next-line @typescript-eslint/unbound-method
                expect(space3.destroy).toHaveBeenCalledOnce();
            });
        });
    });
});
