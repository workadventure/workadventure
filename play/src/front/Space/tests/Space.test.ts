import { describe, expect, it, vi } from "vitest";
import { FilterType } from "@workadventure/messages";
import { Space } from "../Space";
import { SpaceNameIsEmptyError } from "../Errors/SpaceError";
import type { RoomConnection } from "../../Connection/RoomConnection";

const defaultRoomConnectionMock = {
    emitJoinSpace: vi.fn(),
    emitLeaveSpace: vi.fn(),
    emitAddSpaceFilter: vi.fn(),
} as unknown as RoomConnection;

const defaultPropertiesToSync = ["x", "y", "z"];
const signal = new AbortController().signal;

describe("Space test", () => {
    it("should return a error when pass a empty string as spaceName", async () => {
        const spaceName = "";

        await expect(
            Space.create(
                spaceName,
                FilterType.ALL_USERS,
                defaultRoomConnectionMock,
                defaultPropertiesToSync,
                new AbortController().signal
            )
        ).rejects.toThrow(SpaceNameIsEmptyError);
    });
    it("should not return a error when pass a string as spaceName", async () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();

        const space = await Space.create(
            spaceName,
            FilterType.ALL_USERS,
            defaultRoomConnectionMock,
            defaultPropertiesToSync,
            signal,
            {
                metadata,
            }
        );
        expect(space.getName()).toBe(spaceName);
    });
    it("should emit joinSpace event when you create the space", async () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();
        const mockRoomConnection = {
            emitJoinSpace: vi.fn(),
        };

        await Space.create(
            spaceName,
            FilterType.ALL_USERS,
            mockRoomConnection as unknown as RoomConnection,
            defaultPropertiesToSync,
            signal,
            {
                metadata,
            }
        );

        expect(mockRoomConnection.emitJoinSpace).toHaveBeenCalledOnce();

        expect(mockRoomConnection.emitJoinSpace).toHaveBeenCalledWith(
            spaceName,
            FilterType.ALL_USERS,
            defaultPropertiesToSync,
            {
                signal: signal,
            }
        );
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
            defaultPropertiesToSync,
            signal,
            {
                metadata,
            }
        );

        await space.destroy();

        expect(mockRoomConnection.emitLeaveSpace).toHaveBeenCalledOnce();

        expect(mockRoomConnection.emitLeaveSpace).toHaveBeenLastCalledWith(spaceName);
    });
    it("should add metadata when key is not in metadata map", async () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();

        const space = await Space.create(
            spaceName,
            FilterType.ALL_USERS,
            defaultRoomConnectionMock,
            defaultPropertiesToSync,
            signal,
            {
                metadata,
            }
        );

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

        const space = await Space.create(
            spaceName,
            FilterType.ALL_USERS,
            defaultRoomConnectionMock,
            defaultPropertiesToSync,
            signal,
            {
                metadata,
            }
        );

        const newMetadata = new Map<string, unknown>([["metadata-1", 0]]);

        space.setMetadata(newMetadata);

        const result = space.getMetadata();

        expect(result).toStrictEqual(newMetadata);
    });
    it("should not delete metadata who is in space data but not in newMetadata map ", async () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>([["metadata-1", 4]]);

        const space = await Space.create(
            spaceName,
            FilterType.ALL_USERS,
            defaultRoomConnectionMock,
            defaultPropertiesToSync,
            signal,
            {
                metadata,
            }
        );

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
