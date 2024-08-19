import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Space } from "../Space";
import { SpaceFilterAlreadyExistError, SpaceNameIsEmptyError } from "../Errors/SpaceError";
import { SpaceFilterInterface } from "../SpaceFilter/SpaceFilter";
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
    emitWatchSpace: vi.fn(),
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
            emitWatchSpace: vi.fn(),
        };

        new Space(spaceName, metadata, mockRoomConnection as unknown as RoomConnection);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockRoomConnection.emitWatchSpace).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockRoomConnection.emitWatchSpace).toHaveBeenCalledWith(spaceName);
    });

    it("should emit leaveSpace event when you call destroy", () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();

        const mockRoomConnection = {
            emitWatchSpace: vi.fn(),
            emitUnwatchSpace: vi.fn(),
        };

        const space = new Space(spaceName, metadata, mockRoomConnection as unknown as RoomConnection);

        space.destroy();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockRoomConnection.emitUnwatchSpace).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockRoomConnection.emitUnwatchSpace).toHaveBeenLastCalledWith(spaceName);
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

    it("should return a error when spaceName exist", () => {
        const spaceName = "space-name";
        const spaceFilterName = "space-filter-name";

        const metadata = new Map<string, unknown>([["metadata-1", 4]]);

        const filter: Partial<SpaceFilterInterface> = {};
        const spaceFilterMap = new Map<string, Partial<SpaceFilterInterface>>([[spaceFilterName, filter]]);

        const space = new Space(
            spaceName,
            metadata,
            defaultRoomConnectionMock,
            spaceFilterMap as Map<string, SpaceFilterInterface>
        );

        expect(() => {
            space.watch(spaceFilterName);
        }).toThrow(SpaceFilterAlreadyExistError);
    });

    it("should return a spacefilter when spaceName  not exist", () => {
        const spaceName = "space-name";
        const spaceFilterName = "space-filter-name";

        const metadata = new Map<string, unknown>([["metadata-1", 4]]);

        const space = new Space(spaceName, metadata, defaultRoomConnectionMock);

        const spaceFilter = space.watch(spaceFilterName);
        expect(spaceFilter).toBeDefined();
        if (!spaceFilter) return;

        expect(spaceFilter.getName()).toBe(spaceFilterName);
        expect(spaceFilter.getUsers()).toHaveLength(0);
    });
    it("should call filterDestroy when you stop watching filter", () => {
        const spaceName = "space-name";
        const spaceFilterName = "space-filter-name";
        const metadata = new Map<string, unknown>([["metadata-1", 4]]);

        const filter: Partial<SpaceFilterInterface> = {
            destroy: vi.fn(),
        };
        const spaceFilterMap = new Map<string, Partial<SpaceFilterInterface>>([[spaceFilterName, filter]]);
        const space = new Space(
            spaceName,
            metadata,
            defaultRoomConnectionMock,
            spaceFilterMap as Map<string, SpaceFilterInterface>
        );
        space.stopWatching(spaceFilterName);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(filter.destroy).toHaveBeenCalledOnce();
    });
});
