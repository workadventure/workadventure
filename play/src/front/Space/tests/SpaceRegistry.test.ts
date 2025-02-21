import { describe, expect, it, vi } from "vitest";
import { RoomConnectionForSpacesInterface, SpaceRegistry } from "../SpaceRegistry/SpaceRegistry";
import { SpaceInterface } from "../SpaceInterface";
import { SpaceAlreadyExistError, SpaceDoesNotExistError } from "../Errors/SpaceError";
import { PeerFactoryInterface, PeerStoreInterface, Space } from "../Space";
import { MockRoomConnectionForSpaces } from "./MockRoomConnectionForSpaces";

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

// Mock the PeerStore module
vi.mock("../../Stores/PeerStore", () => ({
    peerStore: {
        getSpaceStore: vi.fn(),
        cleanupStore: vi.fn(),
        removePeer: vi.fn(),
        getPeer: vi.fn(),
    },
    screenSharingPeerStore: {
        getSpaceStore: vi.fn(),
        cleanupStore: vi.fn(),
        removePeer: vi.fn(),
        getPeer: vi.fn(),
    },
}));

// Mock SimplePeer
vi.mock("../../WebRtc/SimplePeer", () => ({
    SimplePeer: vi.fn().mockImplementation(() => ({
        closeAllConnections: vi.fn(),
        destroy: vi.fn(),
    })),
}));

const defaultPeerFactoryMock = {
    create: vi.fn(),
} as unknown as PeerFactoryInterface;

const defaultPeerStoreMock = {
    getSpaceStore: vi.fn(),
    cleanupStore: vi.fn(),
    removePeer: vi.fn(),
    getPeer: vi.fn(),
} as unknown as PeerStoreInterface;

const defaultRoomConnectionMock: RoomConnectionForSpacesInterface = new MockRoomConnectionForSpaces();

describe("SpaceProviderInterface implementation", () => {
    describe("SpaceRegistry", () => {
        describe("SpaceRegistry Add", () => {
            it("should add a space when ...", () => {
                const newSpace: Pick<SpaceInterface, "getName"> = {
                    getName(): string {
                        return "space-test";
                    },
                };

                const spaceRegistry: SpaceRegistry = new SpaceRegistry(
                    defaultRoomConnectionMock,
                    defaultPeerFactoryMock,
                    defaultPeerStoreMock,
                    defaultPeerStoreMock
                );
                spaceRegistry.joinSpace(newSpace.getName(), []);
                expect(spaceRegistry.get(newSpace.getName())).toBeInstanceOf(Space);
            });
            it("should return a error when you try to add a space which already exist", () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                } as SpaceInterface;

                const spaceRegistry: SpaceRegistry = new SpaceRegistry(
                    defaultRoomConnectionMock,
                    defaultPeerFactoryMock,
                    defaultPeerStoreMock,
                    defaultPeerStoreMock
                );
                spaceRegistry.joinSpace(newSpace.getName(), []);
                expect(() => {
                    spaceRegistry.joinSpace(newSpace.getName(), []);
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

                const spaceRegistry: SpaceRegistry = new SpaceRegistry(
                    defaultRoomConnectionMock,
                    defaultPeerFactoryMock,
                    defaultPeerStoreMock,
                    defaultPeerStoreMock
                );

                spaceRegistry.joinSpace(newSpace.getName(), []);

                const result: boolean = spaceRegistry.exist(newSpace.getName());

                expect(result).toBeTruthy();
            });
            it("should return false when space is in store", () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                } as SpaceInterface;
                const spaceRegistry: SpaceRegistry = new SpaceRegistry(
                    defaultRoomConnectionMock,
                    defaultPeerFactoryMock,
                    defaultPeerStoreMock,
                    defaultPeerStoreMock
                );
                const result: boolean = spaceRegistry.exist(newSpace.getName());
                expect(result).toBeFalsy();
            });
        });
        describe("SpaceRegistry delete", () => {
            it("should delete a space when space is in the store", () => {
                const roomConnectionMock = new MockRoomConnectionForSpaces();
                const spaceRegistry: SpaceRegistry = new SpaceRegistry(
                    roomConnectionMock,
                    defaultPeerFactoryMock,
                    defaultPeerStoreMock,
                    defaultPeerStoreMock
                );

                spaceRegistry.joinSpace("space-test1", []);
                spaceRegistry.joinSpace("space-test2", []);
                const spaceToDelete = spaceRegistry.joinSpace("space-to-delete", []);

                spaceRegistry.leaveSpace(spaceToDelete);
                expect(spaceRegistry.getAll().find((space) => space.getName() === "space-to-delete")).toBeUndefined();
                expect(roomConnectionMock.emitLeaveSpace).toHaveBeenCalledOnce();
            });
            it("should return a error when you try to delete a space who is not in the space ", () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                } as SpaceInterface;
                const spaceRegistry: SpaceRegistry = new SpaceRegistry(
                    defaultRoomConnectionMock,
                    defaultPeerFactoryMock,
                    defaultPeerStoreMock,
                    defaultPeerStoreMock
                );

                expect(() => {
                    spaceRegistry.leaveSpace(newSpace);
                }).toThrow(SpaceDoesNotExistError);
            });
        });
        describe("SpaceRegistry destroy", () => {
            it("should destroy space store", () => {
                const roomConnectionMock = new MockRoomConnectionForSpaces();
                const spaceRegistry: SpaceRegistry = new SpaceRegistry(
                    roomConnectionMock,
                    defaultPeerFactoryMock,
                    defaultPeerStoreMock,
                    defaultPeerStoreMock
                );

                spaceRegistry.joinSpace("space-test1", []);
                spaceRegistry.joinSpace("space-test2", []);
                spaceRegistry.joinSpace("space-test3", []);

                spaceRegistry.destroy();
                expect(spaceRegistry.getAll()).toHaveLength(0);
                // eslint-disable-next-line @typescript-eslint/unbound-method
                expect(roomConnectionMock.emitLeaveSpace).toHaveBeenCalledTimes(3);
            });
        });
    });
});
