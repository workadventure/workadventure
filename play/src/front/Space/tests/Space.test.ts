import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { FilterType } from "@workadventure/messages";
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

    it("should return a error when pass a empty string as spaceName", async () => {
        const spaceName = "";
        const metadata = new Map<string, unknown>();

        await expect(
            Space.create(spaceName, FilterType.ALL_USERS, defaultRoomConnectionMock, metadata)
        ).rejects.toThrow(SpaceNameIsEmptyError);
    });
    it("should not return a error when pass a string as spaceName", async () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();

        const space = await Space.create(spaceName, FilterType.ALL_USERS, defaultRoomConnectionMock, metadata);
        expect(space.getName()).toBe(spaceName);
    });
    it("should emit joinSpace event when you create the space", async () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();
        const mockRoomConnection = {
            emitJoinSpace: vi.fn(),
        };

        await Space.create(spaceName, FilterType.ALL_USERS, mockRoomConnection as unknown as RoomConnection, metadata);

        expect(mockRoomConnection.emitJoinSpace).toHaveBeenCalledOnce();

        expect(mockRoomConnection.emitJoinSpace).toHaveBeenCalledWith(spaceName, FilterType.ALL_USERS);
    });

    it("should emit leaveSpace event when you call destroy", async () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();

        const mockRoomConnection = {
            emitJoinSpace: vi.fn(),
            emitLeaveSpace: vi.fn(),
        };

        const space = await Space.create(
            spaceName,
            FilterType.ALL_USERS,
            mockRoomConnection as unknown as RoomConnection,
            metadata
        );

        await space.destroy();

        expect(mockRoomConnection.emitLeaveSpace).toHaveBeenCalledOnce();

        expect(mockRoomConnection.emitLeaveSpace).toHaveBeenLastCalledWith(spaceName);
    });
    it("should add metadata when key is not in metadata map", async () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();

        const space = await Space.create(spaceName, FilterType.ALL_USERS, defaultRoomConnectionMock, metadata);

        const newMetadata = new Map<string, unknown>([
            ["metadata-1", 0],
            ["metadata-2", "md2"],
            ["metadata-3", "md3"],
        ]);

        space.setMetadata(newMetadata);

        const result = space.getMetadata();

        expect(result).toStrictEqual(newMetadata);
    });
    it("should update metadata when key is already in metadata map ", async () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>([["metadata-1", 4]]);

        const space = await Space.create(spaceName, FilterType.ALL_USERS, defaultRoomConnectionMock, metadata);

        const newMetadata = new Map<string, unknown>([["metadata-1", 0]]);

        space.setMetadata(newMetadata);

        const result = space.getMetadata();

        expect(result).toStrictEqual(newMetadata);
    });
    it("should not delete metadata who is in space data but not in newMetadata map ", async () => {
        const spaceName = "space-name";

        const metadata = new Map<string, unknown>([["metadata-1", 4]]);

        const space = await Space.create(spaceName, FilterType.ALL_USERS, defaultRoomConnectionMock, metadata);

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
