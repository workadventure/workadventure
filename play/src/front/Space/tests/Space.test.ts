import { describe, it, expect, vi } from "vitest";
import { UnwatchSpaceMessage, WatchSpaceMessage } from "@workadventure/messages";
vi.mock("../../Phaser/Entity/CharacterLayerManager", () => {
    return {
        wokaBase64(): Promise<string> {
            return Promise.resolve("");
        },
    };
});
import { Space } from "../Space";
import { SpaceFilterAlreadyExistError, SpaceNameIsEmptyError } from "../Errors/SpaceError";
import { SpaceFilterInterface } from "../SpaceFilter/SpaceFilter";


describe("Space test", () => {
    it("should return a error when pass a empty string as spaceName", () => {
        const spaceName = "";
        const metadata = new Map<string, unknown>();
        const mockSocket = {
            readyState: "CONNECTING",
            send: vi.fn(),
        };
        expect(() => {
            new Space(spaceName, metadata, mockSocket);
        }).toThrow(SpaceNameIsEmptyError);
    });
    it("should not return a error when pass a string as spaceName", () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();
        const mockSocket = {
            readyState: "CONNECTING",
            send: vi.fn(),
        };

       
        const mockEncoder: { encode: (messageCoded: ClientToServerMessage) => { finish: () => Uint8Array } } = {
            encode: vi.fn().mockImplementation((msg) => {
                return {
                    finish: () => new Uint8Array(),
                };
            }),
        };
        const space = new Space(spaceName, metadata, mockSocket, mockEncoder);
        expect(space.getName()).toBe(spaceName);
    });
    it("should emit joinSpace event when you create the space", () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();
        const mockSocket = {
            readyState: "CONNECTING",
            send: vi.fn(),
        };

        const mockEncoder: { encode: (messageCoded: ClientToServerMessage) => { finish: () => Uint8Array } } = {
            encode: vi.fn().mockImplementation((msg) => {
                return {
                    finish: () => msg,
                };
            }),
        };

        const message = {
            message: {
                $case: "watchSpaceMessage",
                watchSpaceMessage: WatchSpaceMessage.fromPartial({
                    spaceName: spaceName,
                    spaceFilter: {
                        filterName: "",
                        spaceName: spaceName,
                        filter: undefined,
                    },
                }),
            },
        };
        new Space(spaceName, metadata, mockSocket, mockEncoder);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSocket.send).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSocket.send).toHaveBeenCalledWith(message);

        expect(mockEncoder.encode).toHaveBeenCalledOnce();

        expect(mockEncoder.encode).toHaveBeenCalledWith(message);
    });

    it("should emit leaveSpace event when you call destroy", () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();

        const mockSocket = {
            readyState: "CONNECTING",
            send: vi.fn(),
        };

        const mockEncoder: { encode: (messageCoded: ClientToServerMessage) => { finish: () => Uint8Array } } = {
            encode: vi.fn().mockImplementation((msg) => {
                return {
                    finish: () => msg,
                };
            }),
        };

        const message = {
            message: {
                $case: "unwatchSpaceMessage",
                unwatchSpaceMessage: UnwatchSpaceMessage.fromPartial({
                    spaceName: spaceName,
                }),
            },
        };
        const space = new Space(spaceName, metadata, mockSocket, mockEncoder);

        space.destroy();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSocket.send).toHaveBeenCalledTimes(2);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSocket.send).toHaveBeenLastCalledWith(message);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockEncoder.encode).toHaveBeenCalledTimes(2);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockEncoder.encode).toHaveBeenLastCalledWith(message);
    });
    it("should add metadata when key is not in metadata map", () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();
        const mockSocket = {
            readyState: "CONNECTING",
            send: vi.fn(),
        };

        const mockEncoder: { encode: (messageCoded: ClientToServerMessage) => { finish: () => Uint8Array } } = {
            encode: vi.fn().mockImplementation((msg) => {
                return {
                    finish: () => msg,
                };
            }),
        };

        const space = new Space(spaceName, metadata, mockSocket,mockEncoder);

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
        const mockSocket = {
            readyState: "CONNECTING",
            send: vi.fn(),
        };

        const mockEncoder: { encode: (messageCoded: ClientToServerMessage) => { finish: () => Uint8Array } } = {
            encode: vi.fn().mockImplementation((msg) => {
                return {
                    finish: () => msg,
                };
            }),
        };

        const space = new Space(spaceName, metadata, mockSocket,mockEncoder);

        const newMetadata = new Map<string, unknown>([["metadata-1", 0]]);

        space.setMetadata(newMetadata);

        const result = space.getMetadata();

        expect(result).toStrictEqual(newMetadata);
    });
    it("should not delete metadata who is in space data but not in newMetadata map ", () => {
        const spaceName = "space-name";

        const metadata = new Map<string, unknown>([["metadata-1", 4]]);
        const mockSocket = {
            readyState: "CONNECTING",
            send: vi.fn(),
        };

        const mockEncoder: { encode: (messageCoded: ClientToServerMessage) => { finish: () => Uint8Array } } = {
            encode: vi.fn().mockImplementation((msg) => {
                return {
                    finish: () => msg,
                };
            }),
        };

        const space = new Space(spaceName, metadata, mockSocket,mockEncoder);

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
        const mockSocket = {
            readyState: "CONNECTING",
            send: vi.fn(),
        };

        const mockEncoder: { encode: (messageCoded: ClientToServerMessage) => { finish: () => Uint8Array } } = {
            encode: vi.fn().mockImplementation((msg) => {
                return {
                    finish: () => msg,
                };
            }),
        };


        const filter: SpaceFilterInterface = {};
        const spaceFilterMap = new Map<string, SpaceFilterInterface>([[spaceFilterName, filter]]);

        const space = new Space(spaceName, metadata, mockSocket,mockEncoder,spaceFilterMap);
        

        expect(() => {
            space.watch(spaceFilterName);
        }).toThrow(SpaceFilterAlreadyExistError);
    });

    it("should return a spacefilter when spaceName  not exist", () => {
        const spaceName = "space-name";
        const spaceFilterName = "space-filter-name";

        const metadata = new Map<string, unknown>([["metadata-1", 4]]);
        const mockSocket = {
            readyState: "CONNECTING",
            send: ()=>{},
        };

        const mockEncoder: { encode: (messageCoded: ClientToServerMessage) => { finish: () => Uint8Array } } = {
            encode: vi.fn().mockImplementation((msg) => {
                return {
                    finish: () => msg,
                };
            }),
        };

        const space = new Space(spaceName, metadata, mockSocket,mockEncoder);

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
        const mockSocket = {
            readyState: "CONNECTING",
            send: vi.fn(),
        };

        const mockEncoder: { encode: (messageCoded: ClientToServerMessage) => { finish: () => Uint8Array } } = {
            encode: vi.fn().mockImplementation((msg) => {
                return {
                    finish: () => msg,
                };
            }),
        };
        const filter: SpaceFilterInterface = {
            destroy: vi.fn(),
        };
        const spaceFilterMap = new Map<string, SpaceFilterInterface>([[spaceFilterName, filter]]);
        const space = new Space(spaceName, metadata, mockSocket,mockEncoder,spaceFilterMap);
        space.stopWatching(spaceFilterName);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(filter.destroy).toHaveBeenCalledOnce();
    });
});
