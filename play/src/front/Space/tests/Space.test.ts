import { describe, it, expect, vi } from "vitest";
import { Space } from "../Space";
import { SpaceFilterAlreadyExistError, SpaceNameIsEmptyError } from "../Errors/SpaceError";
import { SpaceInterface } from "../SpaceInterface";
import { SpaceEventEmitterInterface } from "../SpaceEventEmitter/SpaceEventEmitterInterface";
import { SpaceFilterInterface } from "../SpaceFilter/SpaceFilter";
import { AllSapceEventEmitter } from "../SpaceProvider/SpaceStore";

describe("Space test", () => {
    it("should return a error when pass a empty string as spaceName", () => {
        const spaceName = "";
        const metadata = new Map<string, unknown>();
        const spaceEventEmitter: SpaceEventEmitterInterface = {
            updateSpaceMetadata: vi.fn(),
            userLeaveSpace: vi.fn(),
            userJoinSpace: vi.fn(),
        };
        expect(() => {
            new Space(spaceName, metadata, spaceEventEmitter);
        }).toThrow(SpaceNameIsEmptyError);
    });
    it("should not return a error when pass a string as spaceName", () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();
        const spaceEventEmitter: AllSapceEventEmitter = {
            updateSpaceMetadata: vi.fn(),
            userLeaveSpace: vi.fn(),
            userJoinSpace: vi.fn(),
            addSpaceFilter: vi.fn(),
            removeSpaceFilter: vi.fn(),
            updateSpaceFilter: vi.fn(),
        };
        let space: SpaceInterface;
        expect(() => {
            space = new Space(spaceName, metadata, spaceEventEmitter);
        }).not.toThrow(SpaceNameIsEmptyError);

        expect(space.getName()).toBe(spaceName);
    });
    it("should emit joinSpace event when you create the space", () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();

        const spaceEventEmitter: AllSapceEventEmitter = {
            updateSpaceMetadata: vi.fn(),
            userLeaveSpace: vi.fn(),
            userJoinSpace: vi.fn(),
            addSpaceFilter: vi.fn(),
            removeSpaceFilter: vi.fn(),
            updateSpaceFilter: vi.fn(),
        };
        new Space(spaceName, metadata, spaceEventEmitter);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(spaceEventEmitter.userJoinSpace).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(spaceEventEmitter.userJoinSpace).toHaveBeenCalledWith(spaceName);
    });
    it.skip("should emit updateMeta event when you update the space", () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();

        const spaceEventEmitter: AllSapceEventEmitter = {
            updateSpaceMetadata: vi.fn(),
            userLeaveSpace: vi.fn(),
            userJoinSpace: vi.fn(),
            addSpaceFilter: vi.fn(),
            removeSpaceFilter: vi.fn(),
            updateSpaceFilter: vi.fn(),
        };
        const space = new Space(spaceName, metadata, spaceEventEmitter);

        space.setMetadata(metadata);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(spaceEventEmitter.updateSpaceMetadata).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(spaceEventEmitter.updateSpaceMetadata).toHaveBeenCalledWith(spaceName, metadata);
    });
    it("should emit leaveSpace event when you call destroy", () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();

        const spaceEventEmitter: AllSapceEventEmitter = {
            updateSpaceMetadata: vi.fn(),
            userLeaveSpace: vi.fn(),
            userJoinSpace: vi.fn(),
            addSpaceFilter: vi.fn(),
            removeSpaceFilter: vi.fn(),
            updateSpaceFilter: vi.fn(),
        };
        const space = new Space(spaceName, metadata, spaceEventEmitter);

        space.destroy();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(spaceEventEmitter.userLeaveSpace).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(spaceEventEmitter.userLeaveSpace).toHaveBeenCalledWith(spaceName);
    });
    it("should add metadata when key is not in metadata map", () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();
        const spaceEventEmitter: SpaceEventEmitterInterface = {
            updateSpaceMetadata: vi.fn(),
            userLeaveSpace: vi.fn(),
            userJoinSpace: vi.fn(),
        };

        const space = new Space(spaceName, metadata, spaceEventEmitter);

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
        const spaceEventEmitter: AllSapceEventEmitter = {
            updateSpaceMetadata: vi.fn(),
            userLeaveSpace: vi.fn(),
            userJoinSpace: vi.fn(),
            addSpaceFilter: vi.fn(),
            removeSpaceFilter: vi.fn(),
            updateSpaceFilter: vi.fn(),
        };

        const space = new Space(spaceName, metadata, spaceEventEmitter);

        const newMetadata = new Map<string, unknown>([["metadata-1", 0]]);

        space.setMetadata(newMetadata);

        const result = space.getMetadata();

        expect(result).toStrictEqual(newMetadata);
    });
    it("should not delete metadata who is in space data but not in newMetadata map ", () => {
        const spaceName = "space-name";

        const metadata = new Map<string, unknown>([["metadata-1", 4]]);
        const spaceEventEmitter: AllSapceEventEmitter = {
            updateSpaceMetadata: vi.fn(),
            userLeaveSpace: vi.fn(),
            userJoinSpace: vi.fn(),
            addSpaceFilter: vi.fn(),
            removeSpaceFilter: vi.fn(),
            updateSpaceFilter: vi.fn(),
        };
        const space = new Space(spaceName, metadata, spaceEventEmitter);

        const newMetadata = new Map<string, unknown>([
            ["metadata-2", 0],
            ["metadata-3", 0],
        ]);

        space.setMetadata(newMetadata);

        newMetadata.set("metadata-1", 4);

        const result = space.getMetadata();

        expect(result).toStrictEqual(newMetadata);
    });
    it("should return a spacefilter when spaceName  not exist", () => {
        const spaceName = "space-name";
        const spaceFilterName = "space-filter-name";

        const metadata = new Map<string, unknown>([["metadata-1", 4]]);
        const spaceEventEmitter: AllSapceEventEmitter = {
            updateSpaceMetadata: vi.fn(),
            userLeaveSpace: vi.fn(),
            userJoinSpace: vi.fn(),
            addSpaceFilter: vi.fn(),
            removeSpaceFilter: vi.fn(),
            updateSpaceFilter: vi.fn(),
        };

        const space = new Space(spaceName, metadata, spaceEventEmitter);

        const spaceFilter = space.watch(spaceFilterName);
        expect(spaceFilter).toBeDefined();
        if (!spaceFilter) return;

        expect(spaceFilter.getName()).toBe(spaceFilterName);
        expect(spaceFilter.getUsers()).toHaveLength(0);
    });
    it("should return a error when spaceName exist", () => {
        const spaceName = "space-name";
        const spaceFilterName = "space-filter-name";

        const metadata = new Map<string, unknown>([["metadata-1", 4]]);
        const spaceEventEmitter: AllSapceEventEmitter = {
            updateSpaceMetadata: vi.fn(),
            userLeaveSpace: vi.fn(),
            userJoinSpace: vi.fn(),
            addSpaceFilter: vi.fn(),
            removeSpaceFilter: vi.fn(),
            updateSpaceFilter: vi.fn(),
        };

        const filter: SpaceFilterInterface = {};
        const spaceFilterMap = new Map<string, SpaceFilterInterface>([[spaceFilterName, filter]]);

        const space = new Space(spaceName, metadata, spaceEventEmitter, spaceFilterMap);

        expect(() => {
            space.watch(spaceFilterName);
        }).toThrow(SpaceFilterAlreadyExistError);
    });
    it("should call filterDestroy when you stop watching filter", () => {
        const spaceName = "space-name";
        const spaceFilterName = "space-filter-name";
        const metadata = new Map<string, unknown>([["metadata-1", 4]]);
        const spaceEventEmitter: AllSapceEventEmitter = {
            updateSpaceMetadata: vi.fn(),
            userLeaveSpace: vi.fn(),
            userJoinSpace: vi.fn(),
            addSpaceFilter: vi.fn(),
            removeSpaceFilter: vi.fn(),
            updateSpaceFilter: vi.fn(),
        };
        const filter: SpaceFilterInterface = {
            destroy: vi.fn(),
        };
        const spaceFilterMap = new Map<string, SpaceFilterInterface>([[spaceFilterName, filter]]);
        const space = new Space(spaceName, metadata, spaceEventEmitter, spaceFilterMap);
        space.stopWatching(spaceFilterName);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(filter.destroy).toHaveBeenCalledOnce();
    });
});
