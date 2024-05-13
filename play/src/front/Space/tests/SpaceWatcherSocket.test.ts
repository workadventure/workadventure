import { describe, vi, expect, it, beforeAll, afterAll } from "vitest";
import WS from "vitest-websocket-mock";

vi.mock("../../Phaser/Entity/CharacterLayerManager", () => {
    return {
        wokaBase64(): Promise<string> {
            return Promise.resolve("");
        },
    };
});
import {
    AddSpaceUserMessage,
    RemoveSpaceUserMessage,
    ServerToClientMessage,
    UpdateSpaceMetadataMessage,
    UpdateSpaceUserMessage,
} from "@workadventure/messages";
import { SpaceEvent, StreamSpaceWatcher } from "../SpaceWatcher/SocketSpaceWatcher";
import { SpaceProviderInterface } from "../SpaceProvider/SpacerProviderInterface";
import { SpaceInterface } from "../SpaceInterface";
import { SpaceFilterInterface } from "../SpaceFilter/SpaceFilter";

let serverSocket: WS;
const port = 3333;

describe("StreamSpaceWatcher", () => {
    beforeAll(() => {
        serverSocket = new WS(`ws://localhost:${port}`);
    });
    afterAll(() => {
        serverSocket.close();
    });
    it("should subscribe to all stream when you create StreamSpaceWatcher", () => {
        const mockSocket: WebSocket = {
            addEventListener: vi.fn(),
        };

        const decoder: { decode: (messageCoded: Uint8Array) => ServerToClientMessage } = {
            decode: vi.fn(),
        };

        const SpaceProvider: SpaceProviderInterface = {
            add: vi.fn(),
            delete: vi.fn(),
            exist: vi.fn(),
            get: vi.fn(),
            getAll: vi.fn(),
        };

        new StreamSpaceWatcher(SpaceProvider, mockSocket, decoder);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSocket.addEventListener).toHaveBeenCalledOnce();
        expect(mockSocket.addEventListener.mock.calls[0][0]).toBe("message");
    });
    it("should call addUserToSpace when stream addSpaceUserMessage receive a new message", async () => {
        const mockSocket = new WebSocket(`ws://localhost:${port}`);

        await serverSocket.connected;

        const addSpaceUserMessage: AddSpaceUserMessage = {
            spaceName: "space-name",
            filterName: "filter-name",
            user: {
                id: 1,
            },
        };

        const message: MessageEvent = {
            data: {
                message: {
                    $case: "batchMessage",
                    batchMessage: {
                        payload: [
                            {
                                message: {
                                    $case: SpaceEvent.AddSpaceUser,
                                    addSpaceUserMessage,
                                },
                            },
                        ],
                    },
                },
            },
        };

        const decoder: { decode: (messageCoded: Uint8Array) => ServerToClientMessage } = {
            decode: vi.fn().mockImplementation((obj) => message.data),
        };

        const mockSpaceFilter: SpaceFilterInterface = {
            addUser: vi.fn(),
        };
        const mockSpace: SpaceInterface = {
            getSpaceFilter: vi.fn().mockImplementation(() => mockSpaceFilter),
        };
        const spaceProvider: SpaceProviderInterface = {
            add: vi.fn(),
            delete: vi.fn(),
            exist: vi.fn(),
            get: vi.fn().mockImplementation(() => mockSpace),
            getAll: vi.fn(),
        };

        new StreamSpaceWatcher(spaceProvider, mockSocket, decoder);

        serverSocket.send(message);

        expect(decoder.decode).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(spaceProvider.get).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(spaceProvider.get).toHaveBeenCalledWith(addSpaceUserMessage.spaceName);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSpace.getSpaceFilter).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSpace.getSpaceFilter).toHaveBeenCalledWith(addSpaceUserMessage.filterName);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSpaceFilter.addUser).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSpaceFilter.addUser).toHaveBeenCalledWith(addSpaceUserMessage.user);
    });
    it("should call removeUserToSpace when stream removeSpaceUserMessage receive a new message", async () => {
        const mockSocket = new WebSocket(`ws://localhost:${port}`);

        await serverSocket.connected;

        const removeSpaceUserMessage: RemoveSpaceUserMessage = {
            spaceName: "space-name",
            filterName: "filter-name",
            userId: 1,
        };

        const message: MessageEvent = {
            data: {
                message: {
                    $case: "batchMessage",
                    batchMessage: {
                        payload: [
                            {
                                message: {
                                    $case: SpaceEvent.RemoveSpaceUser,
                                    removeSpaceUserMessage,
                                },
                            },
                        ],
                    },
                },
            },
        };

        const decoder: { decode: (messageCoded: Uint8Array) => ServerToClientMessage } = {
            decode: vi.fn().mockImplementation((obj) => message.data),
        };

        const mockSpaceFilter: SpaceFilterInterface = {
            removeUser: vi.fn(),
        };
        const mockSpace: SpaceInterface = {
            getSpaceFilter: vi.fn().mockImplementation(() => mockSpaceFilter),
        };
        const spaceProvider: SpaceProviderInterface = {
            add: vi.fn(),
            delete: vi.fn(),
            exist: vi.fn(),
            get: vi.fn().mockImplementation(() => mockSpace),
            getAll: vi.fn(),
        };

        new StreamSpaceWatcher(spaceProvider, mockSocket, decoder);

        serverSocket.send(message);

        expect(decoder.decode).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(spaceProvider.get).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(spaceProvider.get).toHaveBeenCalledWith(removeSpaceUserMessage.spaceName);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSpace.getSpaceFilter).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSpace.getSpaceFilter).toHaveBeenCalledWith(removeSpaceUserMessage.filterName);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSpaceFilter.removeUser).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSpaceFilter.removeUser).toHaveBeenCalledWith(removeSpaceUserMessage.userId);
    });

    it("should call updateSpaceUserMessage when stream updateSpaceUserMessage receive a new message", async () => {
        const mockSocket = new WebSocket(`ws://localhost:${port}`);

        await serverSocket.connected;

        const updateSpaceUserMessage: UpdateSpaceUserMessage = {
            spaceName: "space-name",
            filterName: "filter-name",
            user: {
                id: 1,
            },
        };

        const message: MessageEvent = {
            data: {
                message: {
                    $case: "batchMessage",
                    batchMessage: {
                        payload: [
                            {
                                message: {
                                    $case: SpaceEvent.UpdateSpaceUser,
                                    updateSpaceUserMessage,
                                },
                            },
                        ],
                    },
                },
            },
        };

        const decoder: { decode: (messageCoded: Uint8Array) => ServerToClientMessage } = {
            decode: vi.fn().mockImplementation((obj) => message.data),
        };

        const mockSpaceFilter: SpaceFilterInterface = {
            updateUserData: vi.fn(),
        };
        const mockSpace: SpaceInterface = {
            getSpaceFilter: vi.fn().mockImplementation(() => mockSpaceFilter),
        };
        const spaceProvider: SpaceProviderInterface = {
            add: vi.fn(),
            delete: vi.fn(),
            exist: vi.fn(),
            get: vi.fn().mockImplementation(() => mockSpace),
            getAll: vi.fn(),
        };

        new StreamSpaceWatcher(spaceProvider, mockSocket, decoder);

        serverSocket.send(message);
        serverSocket.close();

        expect(decoder.decode).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(spaceProvider.get).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(spaceProvider.get).toHaveBeenCalledWith(updateSpaceUserMessage.spaceName);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSpace.getSpaceFilter).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSpace.getSpaceFilter).toHaveBeenCalledWith(updateSpaceUserMessage.filterName);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSpaceFilter.updateUserData).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSpaceFilter.updateUserData).toHaveBeenCalledWith(updateSpaceUserMessage.user);
    });
    it("should call updateSpaceMetadata when stream updateSpaceMetadata receive a new message", async () => {
        const port = 3333;
        const serverSocket = new WS(`ws://localhost:${port}`);
        const mockSocket = new WebSocket(`ws://localhost:${port}`);

        await serverSocket.connected;

        const updateSpaceMetadataMessage: UpdateSpaceMetadataMessage = {
            spaceName: "space-name",
            filterName: "filter-name",
            metadata: JSON.stringify({
                metadata: "test",
            }),
        };

        const message: MessageEvent = {
            data: {
                message: {
                    $case: "batchMessage",
                    batchMessage: {
                        payload: [
                            {
                                message: {
                                    $case: SpaceEvent.updateSpaceMetadata,
                                    updateSpaceMetadataMessage,
                                },
                            },
                        ],
                    },
                },
            },
        };

        const decoder: { decode: (messageCoded: Uint8Array) => ServerToClientMessage } = {
            decode: vi.fn().mockImplementation((obj) => message.data),
        };

        const mockSpace: SpaceInterface = {
            setMetadata: vi.fn(),
        };
        const spaceProvider: SpaceProviderInterface = {
            add: vi.fn(),
            delete: vi.fn(),
            exist: vi.fn(),
            get: vi.fn().mockImplementation(() => mockSpace),
            getAll: vi.fn(),
        };

        new StreamSpaceWatcher(spaceProvider, mockSocket, decoder);

        serverSocket.send(message);

        expect(decoder.decode).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(spaceProvider.get).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(spaceProvider.get).toHaveBeenCalledWith(updateSpaceMetadataMessage.spaceName);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSpace.setMetadata).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockSpace.setMetadata).toHaveBeenCalledWith(new Map([["metadata", "test"]]));
    });
});
