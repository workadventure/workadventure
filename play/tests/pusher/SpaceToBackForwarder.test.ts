import { SpaceUser, SubMessage } from "@workadventure/messages";
import { describe, it, vi, expect } from "vitest";
import { mock } from "vitest-mock-extended";
import { Space } from "../../src/pusher/models/Space";
import { SpaceToBackForwarder } from "../../src/pusher/models/SpaceToBackForwarder";
import { SpaceToFrontDispatcher } from "../../src/pusher/models/SpaceToFrontDispatcher";
import { BackSpaceConnection } from "../../src/pusher/models/Websocket/SocketData";
import { Socket } from "../../src/pusher/services/SocketManager";

//TODO : see if there are not too many repetitions in the tests
const flushPromises = () => new Promise(setImmediate);
describe("SpaceToBackForwarder", () => {
    describe("registerUser", () => {
        it("should throw an error if the user is already added", () => {
            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUser: SpaceUser.fromPartial({
                        spaceUserId: "foo_1",
                    }),
                }),
            });
            const mockSpace = mock<Space>({
                _localConnectedUser: new Map([["foo_1", mockSocket]]),
            });
            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            expect(() => spaceForwarder.registerUser(mockSocket)).toThrow();
        });

        it("should throw an error when the space user id is not found", () => {
            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUser: SpaceUser.fromPartial({
                        spaceUserId: undefined,
                    }),
                }),
            });
            const mockSpace = mock<Space>({
                _localConnectedUser: new Map(),
            });
            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            expect(() => spaceForwarder.registerUser(mockSocket)).toThrow();
        });

        it("should forward to back when spaceuserID is found and not already added", async () => {
            const callbackMap = new Map<string, (...args: unknown[]) => void>();

            const mockWriteFunction = vi.fn();

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    callbackMap.set(event, callback);
                    return mockBackSpaceConnection;
                }),
            });

            const spaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
            });

            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUser,
                }),
            });

            const mockSpace = {
                name: "test",
                _localConnectedUser: new Map<string, Socket>(),
                spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                metadata: new Map(),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            spaceForwarder.registerUser(mockSocket);
            await flushPromises();

            expect(mockWriteFunction).toHaveBeenCalledWith({
                message: {
                    $case: "addSpaceUserMessage",
                    addSpaceUserMessage: { spaceName: "test", user: spaceUser },
                },
            });
            expect(mockWriteFunction).toHaveBeenCalledOnce();
        });

        it("should send metadata to client when metadata is not empty", async () => {
            const callbackMap = new Map<string, (...args: unknown[]) => void>();

            const mockWriteFunction = vi.fn();

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    callbackMap.set(event, callback);
                    return mockBackSpaceConnection;
                }),
            });

            const spaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
            });

            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUser,
                }),
            });

            const mockNotifyMeFunction = vi.fn().mockImplementation((socket: Socket, message: SubMessage) => {});

            const mockSpace = {
                name: "test",
                _localConnectedUser: new Map<string, Socket>(),
                spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                metadata: new Map([["metadata-1", "value-1"]]),
                dispatcher: mock<SpaceToFrontDispatcher>({
                    notifyMe: mockNotifyMeFunction,
                }),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            spaceForwarder.registerUser(mockSocket);
            await flushPromises();

            expect(mockNotifyMeFunction).toHaveBeenCalledWith(mockSocket, {
                message: {
                    $case: "updateSpaceMetadataMessage",
                    updateSpaceMetadataMessage: {
                        spaceName: "test",
                        metadata: JSON.stringify(new Map([["metadata-1", "value-1"]])),
                    },
                },
            });

            expect(mockNotifyMeFunction).toHaveBeenCalledOnce();
        });

        it("should not send metadata to client when metadata is empty", async () => {
            const callbackMap = new Map<string, (...args: unknown[]) => void>();

            const mockWriteFunction = vi.fn();

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    callbackMap.set(event, callback);
                    return mockBackSpaceConnection;
                }),
            });

            const spaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
            });

            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUser,
                }),
            });

            const mockNotifyMeFunction = vi.fn().mockImplementation((socket: Socket, message: SubMessage) => {});

            const mockSpace = {
                name: "test",
                _localConnectedUser: new Map<string, Socket>(),
                spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                metadata: new Map(),
                dispatcher: mock<SpaceToFrontDispatcher>({
                    notifyMe: mockNotifyMeFunction,
                }),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            spaceForwarder.registerUser(mockSocket);
            await flushPromises();

            expect(mockNotifyMeFunction).not.toHaveBeenCalled();
        });
    });

    describe("updateUser", () => {
        it("should forward to back when user is found and not already added", async () => {
            const callbackMap = new Map<string, (...args: unknown[]) => void>();

            const mockWriteFunction = vi.fn();

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    callbackMap.set(event, callback);
                    return mockBackSpaceConnection;
                }),
            });

            const spaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
            });

            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUser,
                }),
            });

            const mockSpace = {
                name: "test",
                _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                metadata: new Map(),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            spaceForwarder.updateUser(spaceUser, ["name"]);
            await flushPromises();

            expect(mockWriteFunction).toHaveBeenCalledWith({
                message: {
                    $case: "updateSpaceUserMessage",
                    updateSpaceUserMessage: { spaceName: "test", user: spaceUser, updateMask: ["name"] },
                },
            });
            expect(mockWriteFunction).toHaveBeenCalledOnce();
        });
        it("should throw an error when the user is not found in pusher local connected user", () => {
            const callbackMap = new Map<string, (...args: unknown[]) => void>();

            const mockWriteFunction = vi.fn();

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    callbackMap.set(event, callback);
                    return mockBackSpaceConnection;
                }),
            });

            const spaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
            });

            const mockSpace = {
                name: "test",
                _localConnectedUser: new Map<string, Socket>(),
                spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                metadata: new Map(),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            expect(() => spaceForwarder.updateUser(spaceUser, ["name"])).toThrow();
        });
        it("should throw an error when the space user id is not found", () => {
            const callbackMap = new Map<string, (...args: unknown[]) => void>();

            const mockWriteFunction = vi.fn();

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    callbackMap.set(event, callback);
                    return mockBackSpaceConnection;
                }),
            });

            const spaceUser = SpaceUser.fromPartial({
                spaceUserId: undefined,
            });

            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUser,
                }),
            });

            const mockSpace = {
                name: "test",
                _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                metadata: new Map(),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            expect(() => spaceForwarder.updateUser(spaceUser, ["name"])).toThrow();
        });
    });

    describe("unregisterUser", () => {
        it("should throw an error when the space user id is not found", () => {
            const callbackMap = new Map<string, (...args: unknown[]) => void>();

            const mockWriteFunction = vi.fn();

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    callbackMap.set(event, callback);
                    return mockBackSpaceConnection;
                }),
            });

            const spaceUser = SpaceUser.fromPartial({
                spaceUserId: undefined,
            });

            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUser,
                }),
            });

            const mockSpace = {
                name: "test",
                _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                metadata: new Map(),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            expect(() => spaceForwarder.unregisterUser(mockSocket)).toThrow();
        });
        it("should throw an error when the user is not found in pusher local connected user", () => {
            const callbackMap = new Map<string, (...args: unknown[]) => void>();

            const mockWriteFunction = vi.fn();

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    callbackMap.set(event, callback);
                    return mockBackSpaceConnection;
                }),
            });

            const spaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
            });

            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUser,
                }),
            });

            const mockSpace = {
                name: "test",
                _localConnectedUser: new Map<string, Socket>(),
                spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                metadata: new Map(),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            expect(() => spaceForwarder.unregisterUser(mockSocket)).toThrow();
        });
        it("should forward to back when user is found and not already added", async () => {
            const callbackMap = new Map<string, (...args: unknown[]) => void>();

            const mockWriteFunction = vi.fn();

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    callbackMap.set(event, callback);
                    return mockBackSpaceConnection;
                }),
            });

            const spaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
            });

            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUser,
                }),
            });

            const mockSpace = {
                name: "test",
                _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                _localWatchers: new Map<string, Socket>(),
                spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                metadata: new Map(),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            spaceForwarder.unregisterUser(mockSocket);
            await flushPromises();

            expect(mockWriteFunction).toHaveBeenCalledWith({
                message: {
                    $case: "removeSpaceUserMessage",
                    removeSpaceUserMessage: { spaceName: "test", spaceUserId: "foo_1" },
                },
            });
            expect(mockWriteFunction).toHaveBeenCalledOnce();
        });
    });

    describe("updateMetadata", () => {
        it("should forward to back", async () => {
            const callbackMap = new Map<string, (...args: unknown[]) => void>();

            const mockWriteFunction = vi.fn();

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    callbackMap.set(event, callback);
                    return mockBackSpaceConnection;
                }),
            });

            const spaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
            });

            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUser,
                }),
            });

            const mockSpace = {
                name: "test",
                _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                _localWatchers: new Map<string, Socket>(),
                spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                metadata: new Map(),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            spaceForwarder.updateMetadata({
                "metadata-1": "value-1",
            });
            await flushPromises();

            expect(mockWriteFunction).toHaveBeenCalledWith({
                message: {
                    $case: "updateSpaceMetadataMessage",
                    updateSpaceMetadataMessage: {
                        spaceName: "test",
                        metadata: JSON.stringify({
                            "metadata-1": "value-1",
                        }),
                    },
                },
            });
            expect(mockWriteFunction).toHaveBeenCalledOnce();
        });
    });

    describe("forwardMessageToSpaceBack", () => {
        it("should forward to back", async () => {
            const callbackMap = new Map<string, (...args: unknown[]) => void>();

            const mockWriteFunction = vi.fn();

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    callbackMap.set(event, callback);
                    return mockBackSpaceConnection;
                }),
            });

            const mockSpace = {
                name: "test",
                _localConnectedUser: new Map<string, Socket>(),
                _localWatchers: new Map<string, Socket>(),
                spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                metadata: new Map(),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            spaceForwarder.forwardMessageToSpaceBack({
                $case: "updateSpaceMetadataMessage",
                updateSpaceMetadataMessage: {
                    spaceName: "test",
                    metadata: JSON.stringify({
                        "metadata-1": "value-1",
                    }),
                },
            });
            await flushPromises();

            expect(mockWriteFunction).toHaveBeenCalledWith({
                message: {
                    $case: "updateSpaceMetadataMessage",
                    updateSpaceMetadataMessage: {
                        spaceName: "test",
                        metadata: JSON.stringify({
                            "metadata-1": "value-1",
                        }),
                    },
                },
            });
            expect(mockWriteFunction).toHaveBeenCalledOnce();
        });

        it("should throw an error when spaceStreamToBackPromise is undefined", () => {
            const callbackMap = new Map<string, (...args: unknown[]) => void>();

            const mockWriteFunction = vi.fn();

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    callbackMap.set(event, callback);
                    return mockBackSpaceConnection;
                }),
            });

            const mockSpace = {
                name: "test",
                _localConnectedUser: new Map<string, Socket>(),
                _localWatchers: new Map<string, Socket>(),
                spaceStreamToBackPromise: undefined,
                metadata: new Map(),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            expect(() =>
                spaceForwarder.forwardMessageToSpaceBack({
                    $case: "updateSpaceMetadataMessage",
                    updateSpaceMetadataMessage: {
                        spaceName: "test",
                        metadata: JSON.stringify({
                            "metadata-1": "value-1",
                        }),
                    },
                })
            ).toThrow();
        });
    });

    describe("syncLocalUsersWithServer", () => {
        it("should forward to back", async () => {
            const callbackMap = new Map<string, (...args: unknown[]) => void>();

            const mockWriteFunction = vi.fn();

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    callbackMap.set(event, callback);
                    return mockBackSpaceConnection;
                }),
            });

            const spaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
            });

            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUser,
                }),
            });

            const mockSpace = {
                name: "test",
                _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                _localWatchers: new Map<string, Socket>(),
                spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                metadata: new Map(),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            spaceForwarder.syncLocalUsersWithServer([spaceUser]);
            await flushPromises();

            expect(mockWriteFunction).toHaveBeenCalledWith({
                message: {
                    $case: "syncSpaceUsersMessage",
                    syncSpaceUsersMessage: { spaceName: "test", users: [spaceUser] },
                },
            });
            expect(mockWriteFunction).toHaveBeenCalledOnce();
        });
    });
});
