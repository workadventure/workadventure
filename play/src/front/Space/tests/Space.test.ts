import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Space } from "../Space";
import { SpaceNameIsEmptyError } from "../Errors/SpaceError";
import { RoomConnection } from "../../Connection/RoomConnection";

// Mock the entire GameManager module
vi.mock("../../Phaser/Game/GameManager", () => ({
    gameManager: {
        getCurrentGameScene: vi.fn(() => ({})),
    },
}));

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
    peerElementsStore: {
        subscribe: vi.fn().mockImplementation(() => {
            return () => {};
        }),
    },
    livekitVideoStreamElementsStore: {
        subscribe: vi.fn().mockImplementation(() => {
            return () => {};
        }),
    },
    livekitScreenShareStreamStore: {
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

const defaultRoomConnectionMock = {
    emitJoinSpace: vi.fn(),
    emitLeaveSpace: vi.fn(),
    emitAddSpaceFilter: vi.fn(),
} as unknown as RoomConnection;

const defaultPropertiesToSync = ["x", "y", "z"];

describe("Space test", () => {
    beforeAll(() => {
        const WebSocketMock = vi.fn(() => {
            return {
                CONNECTING: 0,
                CLOSING: 2,
                CLOSED: 3,
            };
        });
        vi.stubGlobal("WebSocket", WebSocketMock);
    });

    afterAll(() => {
        vi.restoreAllMocks();
    });

    it("should return a error when pass a empty string as spaceName", () => {
        const spaceName = "";
        const metadata = new Map<string, unknown>();

        expect(() => {
            new Space(spaceName, metadata, defaultRoomConnectionMock, defaultPropertiesToSync);
        }).toThrow(SpaceNameIsEmptyError);
    });
    it("should not return a error when pass a string as spaceName", () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();

        const space = new Space(spaceName, metadata, defaultRoomConnectionMock, defaultPropertiesToSync);
        expect(space.getName()).toBe(spaceName);
    });
    it("should emit joinSpace event when you create the space", () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();
        const mockRoomConnection = {
            emitJoinSpace: vi.fn(),
        };

        new Space(spaceName, metadata, mockRoomConnection as unknown as RoomConnection, defaultPropertiesToSync);

        expect(mockRoomConnection.emitJoinSpace).toHaveBeenCalledOnce();
        expect(mockRoomConnection.emitJoinSpace).toHaveBeenCalledWith(spaceName, defaultPropertiesToSync);
    });

    it("should emit leaveSpace event when you call destroy", () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();

        const mockRoomConnection = {
            emitJoinSpace: vi.fn(),
            emitLeaveSpace: vi.fn(),
        };

        const space = new Space(
            spaceName,
            metadata,
            mockRoomConnection as unknown as RoomConnection,
            defaultPropertiesToSync
        );

        space.destroy();

        expect(mockRoomConnection.emitLeaveSpace).toHaveBeenCalledOnce();

        expect(mockRoomConnection.emitLeaveSpace).toHaveBeenLastCalledWith(spaceName);
    });
    it("should add metadata when key is not in metadata map", () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();

        const space = new Space(spaceName, metadata, defaultRoomConnectionMock, defaultPropertiesToSync);

        const newMetadata = new Map<string, unknown>([
            ["metadata-1", 0],
            ["metadata-2", "md2"],
            ["metadata-3", "md3"],
        ]);

        space.setMetadata(newMetadata);

        const result = space.getMetadata();

        expect(result).toStrictEqual(newMetadata);
    });
    it("should update metadata when key is already in metadata map ", () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>([["metadata-1", 4]]);

        const space = new Space(spaceName, metadata, defaultRoomConnectionMock, defaultPropertiesToSync);

        const newMetadata = new Map<string, unknown>([["metadata-1", 0]]);

        space.setMetadata(newMetadata);

        const result = space.getMetadata();

        expect(result).toStrictEqual(newMetadata);
    });
    it("should not delete metadata who is in space data but not in newMetadata map ", () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>([["metadata-1", 4]]);

        const space = new Space(spaceName, metadata, defaultRoomConnectionMock, defaultPropertiesToSync);

        const newMetadata = new Map<string, unknown>([
            ["metadata-2", 0],
            ["metadata-3", 0],
        ]);

        space.setMetadata(newMetadata);

        newMetadata.set("metadata-1", 4);

        const result = space.getMetadata();

        expect(result).toStrictEqual(newMetadata);
    });
});
