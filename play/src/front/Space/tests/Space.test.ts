import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Space } from "../Space";
import { SpaceNameIsEmptyError } from "../Errors/SpaceError";
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
    emitAddSpaceFilter: vi.fn(),
} as unknown as RoomConnection;

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
            new Space(spaceName, metadata, defaultRoomConnectionMock);
        }).toThrow(SpaceNameIsEmptyError);
    });
    it("should not return a error when pass a string as spaceName", () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();

        const space = new Space(spaceName, metadata, defaultRoomConnectionMock);
        expect(space.getName()).toBe(spaceName);
    });
    it("should emit joinSpace event when you create the space", () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();
        const mockRoomConnection = {
            emitJoinSpace: vi.fn(),
        };

        new Space(spaceName, metadata, mockRoomConnection as unknown as RoomConnection);

        expect(mockRoomConnection.emitJoinSpace).toHaveBeenCalledOnce();

        expect(mockRoomConnection.emitJoinSpace).toHaveBeenCalledWith(spaceName);
    });

    it("should emit leaveSpace event when you call destroy", () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();

        const mockRoomConnection = {
            emitJoinSpace: vi.fn(),
            emitLeaveSpace: vi.fn(),
        };

        const space = new Space(spaceName, metadata, mockRoomConnection as unknown as RoomConnection);

        space.destroy();

        expect(mockRoomConnection.emitLeaveSpace).toHaveBeenCalledOnce();

        expect(mockRoomConnection.emitLeaveSpace).toHaveBeenLastCalledWith(spaceName);
    });
    it("should add metadata when key is not in metadata map", () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();

        const space = new Space(spaceName, metadata, defaultRoomConnectionMock);

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

        const space = new Space(spaceName, metadata, defaultRoomConnectionMock);

        const newMetadata = new Map<string, unknown>([["metadata-1", 0]]);

        space.setMetadata(newMetadata);

        const result = space.getMetadata();

        expect(result).toStrictEqual(newMetadata);
    });
    it("should not delete metadata who is in space data but not in newMetadata map ", () => {
        const spaceName = "space-name";

        const metadata = new Map<string, unknown>([["metadata-1", 4]]);

        const space = new Space(spaceName, metadata, defaultRoomConnectionMock);

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
