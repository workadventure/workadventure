import { FilterType, SpaceUser, SubMessage } from "@workadventure/messages";
import { describe, it, vi, expect } from "vitest";
import { mock } from "vitest-mock-extended";
import { Space } from "../../src/pusher/models/Space";
import { Query } from "../../src/pusher/models/SpaceQuery";
import { SpaceToBackForwarder } from "../../src/pusher/models/SpaceToBackForwarder";
import { SpaceToFrontDispatcher } from "../../src/pusher/models/SpaceToFrontDispatcher";
import { BackSpaceConnection } from "../../src/pusher/models/Websocket/SocketData";
import { Socket } from "../../src/pusher/services/SocketManager";

//TODO : see if there are not too many repetitions in the tests
const flushPromises = () => new Promise(setImmediate);
describe("SpaceToBackForwarder", () => {
    describe("registerUser", () => {
        it("should throw an error if the user is already added", async () => {
            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUserId: "foo_1",
                }),
            });
            const mockSpace = mock<Space>({
                _localConnectedUser: new Map([["foo_1", mockSocket]]),
                _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>([
                    [
                        mockSocket,
                        SpaceUser.fromPartial({
                            spaceUserId: "foo_1",
                        }),
                    ],
                ]),
                query: mock<Query>({
                    send: vi.fn().mockResolvedValue({
                        $case: "addSpaceUserAnswer",
                        addSpaceUserAnswer: {
                            spaceName: "test",
                            user: SpaceUser.fromPartial({
                                spaceUserId: "foo_1",
                            }),
                        },
                    }),
                }),
            });
            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            await expect(
                async () => await spaceForwarder.registerUser(mockSocket, FilterType.ALL_USERS)
            ).rejects.toThrow();
        });

        it("should throw an error when the space user id is not found", async () => {
            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUserId: undefined,
                }),
            });
            const mockSpace = mock<Space>({
                _localConnectedUser: new Map(),
                _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>(),
            });
            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            await expect(
                async () => await spaceForwarder.registerUser(mockSocket, FilterType.ALL_USERS)
            ).rejects.toThrow();
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

            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUserId: "foo_1",
                    name: "foo_1",
                }),
            });

            const mockSendQuery = vi.fn().mockResolvedValue({
                $case: "addSpaceUserAnswer",
                addSpaceUserAnswer: {
                    spaceName: "test",
                    user: SpaceUser.fromPartial({
                        spaceUserId: "foo_1",
                        name: "foo_1",
                    }),
                },
            });

            const mockSpace = {
                name: "test",
                _localConnectedUser: new Map<string, Socket>(),
                _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>(),
                spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                metadata: new Map(),
                query: mock<Query>({
                    send: mockSendQuery,
                }),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            await spaceForwarder.registerUser(mockSocket, FilterType.ALL_USERS);
            await flushPromises();

            expect(mockSendQuery).toHaveBeenCalledWith({
                $case: "addSpaceUserQuery",
                addSpaceUserQuery: {
                    spaceName: "test",
                    user: {
                        ...SpaceUser.fromPartial({
                            spaceUserId: "foo_1",
                            name: "foo_1",
                            color: "#f87ed1",
                        }),
                        lowercaseName: "foo_1",
                    },
                    filterType: FilterType.ALL_USERS,
                },
            });
            expect(mockSendQuery).toHaveBeenCalledOnce();
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

            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUserId: "foo_1",
                    name: "foo_1",
                }),
            });

            const mockNotifyMeFunction = vi.fn().mockImplementation((socket: Socket, message: SubMessage) => {});

            const mockSpace = {
                name: "test",
                _localConnectedUser: new Map<string, Socket>(),
                _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>(),
                spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                metadata: new Map([["metadata-1", "value-1"]]),
                dispatcher: mock<SpaceToFrontDispatcher>({
                    notifyMe: mockNotifyMeFunction,
                }),
                query: mock<Query>({
                    send: vi.fn().mockResolvedValue({
                        $case: "addSpaceUserAnswer",
                        addSpaceUserAnswer: {
                            spaceName: "test",
                            user: SpaceUser.fromPartial({
                                spaceUserId: "foo_1",
                                name: "foo_1",
                            }),
                        },
                    }),
                }),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            await spaceForwarder.registerUser(mockSocket, FilterType.ALL_USERS);
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

            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUserId: "foo_1",
                    name: "foo_1",
                }),
            });

            const mockNotifyMeFunction = vi.fn().mockImplementation((socket: Socket, message: SubMessage) => {});

            const mockSpace = {
                name: "test",
                _localConnectedUser: new Map<string, Socket>(),
                _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>(),
                spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                metadata: new Map(),
                dispatcher: mock<SpaceToFrontDispatcher>({
                    notifyMe: mockNotifyMeFunction,
                }),
                query: mock<Query>({
                    send: vi.fn().mockResolvedValue({
                        $case: "updateSpaceUserAnswer",
                        updateSpaceUserAnswer: {
                            spaceName: "test",
                            user: SpaceUser.fromPartial({
                                spaceUserId: "foo_1",
                                name: "foo_1",
                            }),
                            updateMask: ["name"],
                        },
                    }),
                }),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            await spaceForwarder.registerUser(mockSocket, FilterType.ALL_USERS);
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
                _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>(),
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
                _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>(),
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
                _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>(),
                spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                metadata: new Map(),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            expect(() => spaceForwarder.updateUser(spaceUser, ["name"])).toThrow();
        });
    });

    describe("unregisterUser", () => {
        it("should throw an error when the space user id is not found", async () => {
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
                _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>(),
                spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                metadata: new Map(),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            await expect(async () => await spaceForwarder.unregisterUser(mockSocket)).rejects.toThrow();
        });
        it("should throw an error when the user is not found in pusher local connected user", async () => {
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
                _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>(),
                spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                metadata: new Map(),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            await expect(async () => await spaceForwarder.unregisterUser(mockSocket)).rejects.toThrow();
        });
        it("should unregister user and send removeSpaceUserQuery when user is found in local connected users", async () => {
            const callbackMap = new Map<string, (...args: unknown[]) => void>();

            const mockWriteFunction = vi.fn();

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    callbackMap.set(event, callback);
                    return mockBackSpaceConnection;
                }),
            });

            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUserId: "foo_1",
                }),
            });

            const mockSendQuery = vi.fn().mockResolvedValue({
                $case: "removeSpaceUserAnswer",
                removeSpaceUserAnswer: { spaceName: "test", spaceUserId: "foo_1" },
            });

            const mockSpace = {
                name: "test",
                _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>(),
                _localWatchers: new Map<string, Socket>(),
                spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                metadata: new Map(),
                query: mock<Query>({
                    send: mockSendQuery,
                }),
                cleanup: vi.fn(),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            await spaceForwarder.unregisterUser(mockSocket);
            await flushPromises();

            expect(mockSendQuery).toHaveBeenCalledWith({
                $case: "removeSpaceUserQuery",
                removeSpaceUserQuery: { spaceName: "test", spaceUserId: "foo_1" },
            });
            expect(mockSendQuery).toHaveBeenCalledOnce();
        });

        it("shouldn't call cleanup when there are still local connected users", async () => {
            const callbackMap = new Map<string, (...args: unknown[]) => void>();

            const mockWriteFunction = vi.fn();

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    callbackMap.set(event, callback);
                    return mockBackSpaceConnection;
                }),
            });
            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUserId: "foo_1",
                }),
            });
            const cleanupMock = vi.fn();
            const mockSendQuery = vi.fn().mockResolvedValue({
                $case: "removeSpaceUserAnswer",
                removeSpaceUserAnswer: { spaceName: "test", spaceUserId: "foo_1" },
            });
            const mockSpace = {
                name: "test",
                _localConnectedUser: new Map<string, Socket>([
                    ["foo_1", mockSocket],
                    ["foo_2", mockSocket],
                ]),
                _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>([
                    [
                        mockSocket,
                        SpaceUser.fromPartial({
                            spaceUserId: "foo_1",
                        }),
                    ],
                    [
                        mockSocket,
                        SpaceUser.fromPartial({
                            spaceUserId: "foo_2",
                        }),
                    ],
                ]),
                _localWatchers: new Map<string, Socket>(),
                spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                metadata: new Map(),
                cleanup: cleanupMock,
                query: mock<Query>({
                    send: mockSendQuery,
                }),
            } as unknown as Space;

            const spaceForwarder = new SpaceToBackForwarder(mockSpace);

            await spaceForwarder.unregisterUser(mockSocket);
            await flushPromises();

            expect(cleanupMock).not.toHaveBeenCalled();
            expect(mockSendQuery).toHaveBeenCalledOnce();
            expect(mockSendQuery).toHaveBeenCalledWith({
                $case: "removeSpaceUserQuery",
                removeSpaceUserQuery: { spaceName: "test", spaceUserId: "foo_1" },
            });
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

            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUserId: "foo_1",
                }),
            });

            const mockSpace = {
                name: "test",
                _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>(),
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
                _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>(),
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
                _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>(),
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
                    spaceUserId: "foo_1",
                }),
            });

            const mockSpace = {
                name: "test",
                _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                _localWatchers: new Map<string, Socket>(),
                _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>([[mockSocket, spaceUser]]),
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
