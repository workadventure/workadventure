import { describe, expect, it, vi } from "vitest";
import { Subject } from "rxjs";
import { FilterType } from "@workadventure/messages";
import { RoomConnectionForSpacesInterface, SpaceRegistry } from "../SpaceRegistry/SpaceRegistry";
import { SpaceInterface } from "../SpaceInterface";
import { SpaceAlreadyExistError, SpaceDoesNotExistError } from "../Errors/SpaceError";
import { Space } from "../Space";
import { SpaceRegistryInterface } from "../SpaceRegistry/SpaceRegistryInterface";
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
    screenSharingPeerStore: {
        getSpaceStore: vi.fn(),
        cleanupStore: vi.fn(),
        removePeer: vi.fn(),
        getPeer: vi.fn(),
    },
    videoStreamStore: {
        subscribe: vi.fn().mockImplementation(() => {
            return () => {};
        }),
    },
    videoStreamElementsStore: {
        subscribe: vi.fn().mockImplementation(() => {
            return () => {};
        }),
    },
    screenShareStreamElementsStore: {
        subscribe: vi.fn().mockImplementation(() => {
            return () => {};
        }),
    },
}));

// Mock SimplePeer
vi.mock("../../WebRtc/SimplePeer", () => ({
    SimplePeer: vi.fn().mockImplementation(() => ({
        closeAllConnections: vi.fn(),
        destroy: vi.fn(),
    })),
}));

vi.mock("../../Connection/ConnectionManager", () => {
    return {
        connectionManager: {
            roomConnectionStream: new Subject(),
        },
    };
});

vi.mock("../../Enum/EnvironmentVariable.ts", () => {
    return {
        MATRIX_ADMIN_USER: "admin",
        MATRIX_DOMAIN: "domain",
        STUN_SERVER: "stun:test.com:19302",
        TURN_SERVER: "turn:test.com:19302",
        TURN_USER: "user",
        TURN_PASSWORD: "password",
        POSTHOG_API_KEY: "test-api-key",
        POSTHOG_URL: "https://test.com",
        MAX_USERNAME_LENGTH: 10,
        PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH: 1000,
        PEER_VIDEO_RECOMMENDED_BANDWIDTH: 1000,
    };
});

const defaultRoomConnectionMock: RoomConnectionForSpacesInterface = new MockRoomConnectionForSpaces();

describe("SpaceProviderInterface implementation", () => {
    describe("SpaceRegistry", () => {
        describe("SpaceRegistry Add", () => {
            it("should add a space when ...", async () => {
                const newSpace: Pick<SpaceInterface, "getName"> = {
                    getName(): string {
                        return "space-test";
                    },
                };

                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(
                    defaultRoomConnectionMock,
                    new Subject()
                );
                await spaceRegistry.joinSpace(newSpace.getName(), FilterType.ALL_USERS, []);
                expect(spaceRegistry.get(newSpace.getName())).toBeInstanceOf(Space);
            });
            it("should return a error when you try to add a space which already exist", async () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                } as SpaceInterface;

                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(
                    defaultRoomConnectionMock,
                    new Subject()
                );
                await spaceRegistry.joinSpace(newSpace.getName(), FilterType.ALL_USERS, []);
                await expect(spaceRegistry.joinSpace(newSpace.getName(), FilterType.ALL_USERS, [])).rejects.toThrow(
                    SpaceAlreadyExistError
                );
            });
        });
        describe("SpaceRegistry exist", () => {
            it("should return true when space is in store", async () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                } as SpaceInterface;

                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(
                    defaultRoomConnectionMock,
                    new Subject()
                );

                await spaceRegistry.joinSpace(newSpace.getName(), FilterType.ALL_USERS, []);

                const result: boolean = spaceRegistry.exist(newSpace.getName());

                expect(result).toBeTruthy();
            });
            it("should return false when space is in store", () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                } as SpaceInterface;
                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(
                    defaultRoomConnectionMock,
                    new Subject()
                );
                const result: boolean = spaceRegistry.exist(newSpace.getName());
                expect(result).toBeFalsy();
            });
        });
        describe("SpaceRegistry delete", () => {
            it("should delete a space when space is in the store", async () => {
                const roomConnectionMock = new MockRoomConnectionForSpaces();
                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(roomConnectionMock, new Subject());

                await spaceRegistry.joinSpace("space-test1", FilterType.ALL_USERS, []);
                await spaceRegistry.joinSpace("space-test2", FilterType.ALL_USERS, []);
                const spaceToDelete = await spaceRegistry.joinSpace("space-to-delete", FilterType.ALL_USERS, []);

                await spaceRegistry.leaveSpace(spaceToDelete);
                expect(spaceRegistry.getAll().find((space) => space.getName() === "space-to-delete")).toBeUndefined();
                expect(roomConnectionMock.emitLeaveSpace).toHaveBeenCalledOnce();
            });
            it("should return a error when you try to delete a space who is not in the space ", async () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                } as SpaceInterface;
                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(
                    defaultRoomConnectionMock,
                    new Subject()
                );

                await expect(spaceRegistry.leaveSpace(newSpace)).rejects.toThrow(SpaceDoesNotExistError);
            });
        });
        describe("SpaceRegistry destroy", () => {
            it("should destroy space store", async () => {
                const roomConnectionMock = new MockRoomConnectionForSpaces();
                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(roomConnectionMock, new Subject());

                await spaceRegistry.joinSpace("space-test1", FilterType.ALL_USERS, []);
                await spaceRegistry.joinSpace("space-test2", FilterType.ALL_USERS, []);
                await spaceRegistry.joinSpace("space-test3", FilterType.ALL_USERS, []);

                await spaceRegistry.destroy();
                expect(spaceRegistry.getAll()).toHaveLength(0);

                expect(roomConnectionMock.emitLeaveSpace).toHaveBeenCalledTimes(3);
            });
        });
    });
});
