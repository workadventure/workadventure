import { SpaceUser, SubMessage, PusherToBackSpaceMessage, FilterType } from "@workadventure/messages";
import { describe, it, vi, expect } from "vitest";
import { mock } from "vitest-mock-extended";
import { EventProcessor } from "../../src/pusher/models/EventProcessor";
import { SpaceToBackForwarder } from "../../src/pusher/models/SpaceToBackForwarder";
import { SpaceToFrontDispatcher } from "../../src/pusher/models/SpaceToFrontDispatcher";
import { BackSpaceConnection } from "../../src/pusher/models/Websocket/SocketData";
import { Socket } from "../../src/pusher/services/SocketManager";
import { Space } from "../../src/pusher/models/Space";

describe("SpaceToFrontDispatcher", () => {
    describe("handleMessage", () => {
        describe("addSpaceUserMessage", () => {
            it.skip("should throw when the space user already exists", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const mockEmitInBatch = vi.fn();

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockSpace = {
                    name: "test",
                    users: new Map<string, SpaceUser>([["foo_1", spaceUser]]),
                    _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                    _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>([[mockSocket, spaceUser]]),
                    _localWatchers: new Set<string>(),
                    localName: "test",
                } as unknown as Space;

                const spaceDispatcher = new SpaceToFrontDispatcher(mockSpace, new EventProcessor());
                spaceDispatcher.handleMessage({
                    message: {
                        $case: "addSpaceUserMessage",
                        addSpaceUserMessage: {
                            spaceName: "test",
                            user: spaceUser,
                            filterType: FilterType.ALL_USERS,
                        },
                    },
                });

                expect(mockEmitInBatch).toHaveBeenCalledWith({
                    message: {
                        $case: "errorMessage",
                        errorMessage: {
                            message:
                                "An error occurred in pusher connection to back: User foo_1 already exists in space test",
                        },
                    },
                });
            });

            it("should notify all users", () => {
                const callbackMap = new Map<string, (...args: unknown[]) => void>();

                const mockWriteFunction = vi.fn();

                const mockBackSpaceConnection = mock<BackSpaceConnection>({
                    write: mockWriteFunction,
                    on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                        callbackMap.set(event, callback);
                        return mockBackSpaceConnection;
                    }),
                });

                const mockEmitInBatch = vi.fn();

                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });
                const mockSpace = {
                    users: new Map<string, SpaceUser>(),
                    _localWatchers: new Set<string>(["foo_1"]),
                    _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                    metadata: new Map(),
                    spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                    localName: "localTest",
                } as unknown as Space;

                const spaceDispatcher = new SpaceToFrontDispatcher(mockSpace, new EventProcessor());

                spaceDispatcher.handleMessage({
                    message: {
                        $case: "addSpaceUserMessage",
                        addSpaceUserMessage: {
                            spaceName: "test",
                            user: spaceUser,
                            filterType: FilterType.ALL_USERS,
                        },
                    },
                });
                expect(mockEmitInBatch).toHaveBeenCalledWith({
                    message: {
                        $case: "addSpaceUserMessage",
                        addSpaceUserMessage: { spaceName: "localTest", user: spaceUser },
                    },
                });
                expect(mockEmitInBatch).toHaveBeenCalledOnce();
            });
        });
        describe("updateSpaceUserMessage", () => {
            it.skip("should throw error when user not found in space", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const mockEmitInBatch = vi.fn();

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockSpace = {
                    name: "test",
                    users: new Map<string, SpaceUser>(),
                    _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                    _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>([[mockSocket, spaceUser]]),
                    _localWatchers: new Set<string>(),
                    localName: "test",
                } as unknown as Space;

                const spaceDispatcher = new SpaceToFrontDispatcher(mockSpace, new EventProcessor());
                spaceDispatcher.handleMessage({
                    message: {
                        $case: "updateSpaceUserMessage",
                        updateSpaceUserMessage: {
                            spaceName: "test",
                            user: spaceUser,
                            updateMask: [],
                        },
                    },
                });

                expect(mockEmitInBatch).toHaveBeenCalledWith({
                    message: {
                        $case: "errorMessage",
                        errorMessage: {
                            message:
                                "An error occurred in pusher connection to back: User not found in this space foo_1",
                        },
                    },
                });
            });

            it("should notify all users", () => {
                const callbackMap = new Map<string, (...args: unknown[]) => void>();

                const mockWriteFunction = vi.fn();

                const mockBackSpaceConnection = mock<BackSpaceConnection>({
                    write: mockWriteFunction,
                    on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                        callbackMap.set(event, callback);
                        return mockBackSpaceConnection;
                    }),
                });

                const mockEmitInBatch = vi.fn();

                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                    name: "foo_1",
                });

                const updatedSpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                    name: "foo_2",
                });

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockSpace = {
                    users: new Map<string, SpaceUser>([["foo_1", spaceUser]]),
                    _localWatchers: new Set<string>(["foo_1"]),
                    _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                    metadata: new Map(),
                    spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                    localName: "localTest",
                } as unknown as Space;

                const spaceDispatcher = new SpaceToFrontDispatcher(mockSpace, new EventProcessor());

                spaceDispatcher.handleMessage({
                    message: {
                        $case: "updateSpaceUserMessage",
                        updateSpaceUserMessage: {
                            spaceName: "test",
                            user: updatedSpaceUser,
                            updateMask: ["name"],
                        },
                    },
                });

                expect(mockEmitInBatch).toHaveBeenCalledWith({
                    message: {
                        $case: "updateSpaceUserMessage",
                        updateSpaceUserMessage: {
                            spaceName: "localTest",
                            user: updatedSpaceUser,
                            updateMask: ["name"],
                        },
                    },
                });
                expect(mockEmitInBatch).toHaveBeenCalledOnce();
            });
        });
        describe("removeSpaceUserMessage", () => {
            it.skip("should throw error when user not found in space", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const mockEmitInBatch = vi.fn();

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockSpace = {
                    name: "test",
                    users: new Map<string, SpaceUser>(),
                    _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                    _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>([[mockSocket, spaceUser]]),
                    _localWatchers: new Set<string>(),
                    localName: "test",
                } as unknown as Space;

                const spaceDispatcher = new SpaceToFrontDispatcher(mockSpace, new EventProcessor());
                spaceDispatcher.handleMessage({
                    message: {
                        $case: "removeSpaceUserMessage",
                        removeSpaceUserMessage: {
                            spaceName: "test",
                            spaceUserId: "foo_1",
                        },
                    },
                });

                expect(mockEmitInBatch).toHaveBeenCalledWith({
                    message: {
                        $case: "errorMessage",
                        errorMessage: {
                            message:
                                "An error occurred in pusher connection to back: User not found in this space foo_1",
                        },
                    },
                });
            });

            it("should notify all users", () => {
                const callbackMap = new Map<string, (...args: unknown[]) => void>();

                const mockWriteFunction = vi.fn();

                const mockBackSpaceConnection = mock<BackSpaceConnection>({
                    write: mockWriteFunction,
                    on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                        callbackMap.set(event, callback);
                        return mockBackSpaceConnection;
                    }),
                });

                const mockEmitInBatch = vi.fn();

                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                    name: "foo_1",
                });

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockSpace = {
                    users: new Map<string, SpaceUser>([["foo_1", spaceUser]]),
                    _localWatchers: new Set<string>(["foo_1"]),
                    _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                    metadata: new Map(),
                    spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                    localName: "localTest",
                } as unknown as Space;

                const spaceDispatcher = new SpaceToFrontDispatcher(mockSpace, new EventProcessor());

                spaceDispatcher.handleMessage({
                    message: {
                        $case: "removeSpaceUserMessage",
                        removeSpaceUserMessage: {
                            spaceName: "test",
                            spaceUserId: "foo_1",
                        },
                    },
                });

                expect(mockEmitInBatch).toHaveBeenCalledWith({
                    message: {
                        $case: "removeSpaceUserMessage",
                        removeSpaceUserMessage: { spaceName: "localTest", spaceUserId: "foo_1" },
                    },
                });
                expect(mockEmitInBatch).toHaveBeenCalledOnce();
            });
        });
        describe("updateSpaceMetadataMessage", () => {
            it("should notify all users", () => {
                const callbackMap = new Map<string, (...args: unknown[]) => void>();

                const mockWriteFunction = vi.fn();

                const mockBackSpaceConnection = mock<BackSpaceConnection>({
                    write: mockWriteFunction,
                    on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                        callbackMap.set(event, callback);
                        return mockBackSpaceConnection;
                    }),
                });

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {});

                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                    name: "foo_1",
                });

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockSpace = {
                    users: new Map<string, SpaceUser>([["foo_1", spaceUser]]),
                    _localWatchers: new Set<string>(["foo_1"]),
                    _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                    metadata: new Map(),
                    spaceStreamToBackPromise: Promise.resolve(mockBackSpaceConnection),
                    localName: "localTest",
                } as unknown as Space;

                const spaceDispatcher = new SpaceToFrontDispatcher(mockSpace, new EventProcessor());

                spaceDispatcher.handleMessage({
                    message: {
                        $case: "updateSpaceMetadataMessage",
                        updateSpaceMetadataMessage: {
                            spaceName: "test",
                            metadata: JSON.stringify({
                                foo: "bar",
                            }),
                        },
                    },
                });

                expect(mockEmitInBatch).toHaveBeenCalledWith({
                    message: {
                        $case: "updateSpaceMetadataMessage",
                        updateSpaceMetadataMessage: {
                            spaceName: "localTest",
                            metadata: JSON.stringify({ foo: "bar" }),
                        },
                    },
                });
                expect(mockEmitInBatch).toHaveBeenCalledOnce();
            });
        });
        describe("pingMessage", () => {
            it.skip("should throw error because it should not be received by the dispatcher - pingMessage should be handle by the space class", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {});

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockSpace = {
                    name: "test",
                    users: new Map<string, SpaceUser>(),
                    _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                    _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>([[mockSocket, spaceUser]]),
                    _localWatchers: new Set<string>(),
                    localName: "test",
                } as unknown as Space;

                const spaceDispatcher = new SpaceToFrontDispatcher(mockSpace, new EventProcessor());
                spaceDispatcher.handleMessage({
                    message: {
                        $case: "pingMessage",
                        pingMessage: {
                            spaceName: "test",
                        },
                    },
                });

                expect(mockEmitInBatch).toHaveBeenCalledWith({
                    message: {
                        $case: "errorMessage",
                        errorMessage: {
                            message:
                                "An error occurred in pusher connection to back: pingMessage should not be received by the dispatcher",
                        },
                    },
                });
            });
        });
        describe("kickOffMessage", () => {
            it("should forward the message to the space back", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {});

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockForwardToBackFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {});
                const mockForwarder = mock<SpaceToBackForwarder>({
                    forwardMessageToSpaceBack: mockForwardToBackFunction,
                });
                const mockSpace = {
                    name: "test",
                    users: new Map<string, SpaceUser>(),
                    _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                    _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>([[mockSocket, spaceUser]]),
                    _localWatchers: new Set<string>(),
                    localName: "test",
                    forwarder: mockForwarder,
                } as unknown as Space;

                const spaceDispatcher = new SpaceToFrontDispatcher(mockSpace, new EventProcessor());
                spaceDispatcher.handleMessage({
                    message: {
                        $case: "kickOffMessage",
                        kickOffMessage: {
                            spaceName: "test",
                            userId: "foo_1",
                        },
                    },
                });

                expect(mockForwardToBackFunction).toHaveBeenCalledWith({
                    $case: "kickOffMessage",
                    kickOffMessage: {
                        spaceName: "test",
                        userId: "foo_1",
                    },
                });
            });
        });
        describe("publicEvent", () => {
            it.skip("should throw error if the event is not defined", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {});

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockForwardToBackFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {});
                const mockForwarder = mock<SpaceToBackForwarder>({
                    forwardMessageToSpaceBack: mockForwardToBackFunction,
                });
                const mockSpace = {
                    name: "test",
                    users: new Map<string, SpaceUser>([["foo_1", spaceUser]]),
                    _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                    _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>([[mockSocket, spaceUser]]),
                    _localWatchers: new Set<string>(),
                    localName: "test",
                    forwarder: mockForwarder,
                } as unknown as Space;

                const spaceDispatcher = new SpaceToFrontDispatcher(mockSpace, new EventProcessor());
                spaceDispatcher.handleMessage({
                    message: {
                        $case: "publicEvent",
                        publicEvent: {
                            spaceName: "test",
                            senderUserId: "foo_1",
                            spaceEvent: {
                                event: undefined,
                            },
                        },
                    },
                });

                expect(mockEmitInBatch).toHaveBeenCalledWith({
                    message: {
                        $case: "errorMessage",
                        errorMessage: { message: "An error occurred in pusher connection to back: event is required" },
                    },
                });
            });
            it.skip("should throw error if the sender is not found in the space", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {});

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockForwardToBackFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {});
                const mockForwarder = mock<SpaceToBackForwarder>({
                    forwardMessageToSpaceBack: mockForwardToBackFunction,
                });
                const mockSpace = {
                    name: "test",
                    users: new Map<string, SpaceUser>([["foo_1", spaceUser]]),
                    _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                    _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>([[mockSocket, spaceUser]]),
                    _localWatchers: new Set<string>(),
                    localName: "test",
                    forwarder: mockForwarder,
                } as unknown as Space;

                const spaceDispatcher = new SpaceToFrontDispatcher(mockSpace, new EventProcessor());
                spaceDispatcher.handleMessage({
                    message: {
                        $case: "publicEvent",
                        publicEvent: {
                            spaceName: "test",
                            senderUserId: "foo_2",
                            spaceEvent: {
                                event: {
                                    $case: "spaceMessage",
                                    spaceMessage: {
                                        message: "test",
                                    },
                                },
                            },
                        },
                    },
                });

                expect(mockEmitInBatch).toHaveBeenCalledWith({
                    message: {
                        $case: "errorMessage",
                        errorMessage: {
                            message:
                                "An error occurred in pusher connection to back: Public message sender foo_2 not found in space test",
                        },
                    },
                });
            });
            it("should forward the event to the space back", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const spaceUser2 = SpaceUser.fromPartial({
                    spaceUserId: "foo_2",
                });

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {});
                const mockEmitInBatch2 = vi.fn().mockImplementation((message: SubMessage) => {});

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockSocket2 = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser2,
                        emitInBatch: mockEmitInBatch2,
                    }),
                });

                const mockForwardToBackFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {});
                const mockForwarder = mock<SpaceToBackForwarder>({
                    forwardMessageToSpaceBack: mockForwardToBackFunction,
                });
                const mockSpace = {
                    name: "test",
                    users: new Map<string, SpaceUser>([
                        ["foo_1", spaceUser],
                        ["foo_2", spaceUser2],
                    ]),
                    _localConnectedUser: new Map<string, Socket>([
                        ["foo_1", mockSocket],
                        ["foo_2", mockSocket2],
                    ]),
                    _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>([
                        [mockSocket, spaceUser],
                        [mockSocket2, spaceUser2],
                    ]),
                    _localWatchers: new Set<string>(),
                    localName: "test",
                    forwarder: mockForwarder,
                } as unknown as Space;

                const spaceDispatcher = new SpaceToFrontDispatcher(mockSpace, new EventProcessor());
                spaceDispatcher.handleMessage({
                    message: {
                        $case: "publicEvent",
                        publicEvent: {
                            spaceName: "test",
                            senderUserId: "foo_1",
                            spaceEvent: {
                                event: {
                                    $case: "spaceMessage",
                                    spaceMessage: {
                                        message: "test",
                                    },
                                },
                            },
                        },
                    },
                });

                expect(mockEmitInBatch2).toHaveBeenCalledWith({
                    message: {
                        $case: "publicEvent",
                        publicEvent: {
                            spaceName: "test",
                            senderUserId: "foo_1",
                            spaceEvent: {
                                event: {
                                    $case: "spaceMessage",
                                    spaceMessage: {
                                        message: "test",
                                    },
                                },
                            },
                        },
                    },
                });

                expect(mockEmitInBatch2).toHaveBeenCalledOnce();
                expect(mockEmitInBatch).not.toHaveBeenCalled();
            });
        });
        describe("privateEvent", () => {
            it.skip("should throw error if the event is not defined", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const mockEmitInBatch = vi.fn();

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockForwardToBackFunction = vi.fn();
                const mockForwarder = mock<SpaceToBackForwarder>({
                    forwardMessageToSpaceBack: mockForwardToBackFunction,
                });
                const mockSpace = {
                    name: "test",
                    users: new Map<string, SpaceUser>([["foo_1", spaceUser]]),
                    _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                    _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>([[mockSocket, spaceUser]]),
                    _localWatchers: new Set<string>(),
                    localName: "test",
                    forwarder: mockForwarder,
                } as unknown as Space;

                const spaceDispatcher = new SpaceToFrontDispatcher(mockSpace, new EventProcessor());
                spaceDispatcher.handleMessage({
                    message: {
                        $case: "privateEvent",
                        privateEvent: {
                            spaceName: "test",
                            sender: SpaceUser.fromPartial({
                                spaceUserId: "foo_1",
                                uuid: "uuid-foo-1",
                            }),
                            receiverUserId: "foo_2",
                            spaceEvent: {
                                event: undefined,
                            },
                        },
                    },
                });

                expect(mockEmitInBatch).toHaveBeenCalledWith({
                    message: {
                        $case: "errorMessage",
                        errorMessage: { message: "An error occurred in pusher connection to back: event is required" },
                    },
                });
            });
            it.skip("should throw error if the receiver is not found in the space", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const mockEmitInBatch = vi.fn();

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockForwardToBackFunction = vi.fn();
                const mockForwarder = mock<SpaceToBackForwarder>({
                    forwardMessageToSpaceBack: mockForwardToBackFunction,
                });
                const mockSpace = {
                    name: "test",
                    users: new Map<string, SpaceUser>([["foo_1", spaceUser]]),
                    _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                    _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>([[mockSocket, spaceUser]]),
                    _localWatchers: new Set<string>(),
                    localName: "test",
                    forwarder: mockForwarder,
                } as unknown as Space;

                const spaceDispatcher = new SpaceToFrontDispatcher(mockSpace, new EventProcessor());
                spaceDispatcher.handleMessage({
                    message: {
                        $case: "privateEvent",
                        privateEvent: {
                            spaceName: "test",
                            sender: SpaceUser.fromPartial({
                                spaceUserId: "foo_1",
                                uuid: "uuid-foo-1",
                            }),
                            receiverUserId: "falseReceiverId",
                            spaceEvent: {
                                event: {
                                    $case: "muteVideo",
                                    muteVideo: {
                                        force: true,
                                    },
                                },
                            },
                        },
                    },
                });

                expect(mockEmitInBatch).toHaveBeenCalledWith({
                    message: {
                        $case: "errorMessage",
                        errorMessage: {
                            message:
                                "An error occurred in pusher connection to back: Private message receiver falseReceiverId not found in space test",
                        },
                    },
                });
            });
            it.skip("should throw error if the sender is not found in the space", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const spaceUser2 = SpaceUser.fromPartial({
                    spaceUserId: "foo_2",
                });

                const mockEmitInBatch = vi.fn();

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockForwardToBackFunction = vi.fn();
                const mockForwarder = mock<SpaceToBackForwarder>({
                    forwardMessageToSpaceBack: mockForwardToBackFunction,
                });
                const mockSpace = {
                    name: "test",
                    users: new Map<string, SpaceUser>([
                        ["foo_1", spaceUser],
                        ["foo_2", spaceUser2],
                    ]),
                    _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
                    _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>([[mockSocket, spaceUser]]),
                    _localWatchers: new Set<string>(),
                    localName: "test",
                    forwarder: mockForwarder,
                } as unknown as Space;

                const spaceDispatcher = new SpaceToFrontDispatcher(mockSpace, new EventProcessor());
                spaceDispatcher.handleMessage({
                    message: {
                        $case: "privateEvent",
                        privateEvent: {
                            spaceName: "test",
                            sender: SpaceUser.fromPartial({
                                spaceUserId: "foo_1",
                                uuid: "uuid-foo-1",
                            }),
                            receiverUserId: "foo_2",
                            spaceEvent: {
                                event: {
                                    $case: "muteVideo",
                                    muteVideo: {
                                        force: true,
                                    },
                                },
                            },
                        },
                    },
                });

                expect(mockEmitInBatch).toHaveBeenCalledWith({
                    message: {
                        $case: "errorMessage",
                        errorMessage: {
                            message:
                                "An error occurred in pusher connection to back: Private message sender falseSenderId not found in space test",
                        },
                    },
                });
            });
            it("should forward the event to the space back", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const spaceUser2 = SpaceUser.fromPartial({
                    spaceUserId: "foo_2",
                });

                const spaceUser3 = SpaceUser.fromPartial({
                    spaceUserId: "foo_3",
                });

                const mockEmitInBatch = vi.fn();
                const mockEmitInBatch2 = vi.fn();

                const mockEmitInBatch3 = vi.fn();

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockSocket2 = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser2,
                        emitInBatch: mockEmitInBatch2,
                    }),
                });

                const mockSocket3 = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser2,
                        emitInBatch: mockEmitInBatch3,
                    }),
                });

                const mockForwardToBackFunction = vi.fn();
                const mockForwarder = mock<SpaceToBackForwarder>({
                    forwardMessageToSpaceBack: mockForwardToBackFunction,
                });
                const mockSpace = {
                    name: "test",
                    users: new Map<string, SpaceUser>([
                        ["foo_1", spaceUser],
                        ["foo_2", spaceUser2],
                        ["foo_3", spaceUser3],
                    ]),
                    _localConnectedUser: new Map<string, Socket>([
                        ["foo_1", mockSocket],
                        ["foo_2", mockSocket2],
                        ["foo_3", mockSocket3],
                    ]),
                    _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>([
                        [mockSocket, spaceUser],
                        [mockSocket2, spaceUser2],
                        [mockSocket3, spaceUser3],
                    ]),
                    _localWatchers: new Set<string>(),
                    localName: "test",
                    forwarder: mockForwarder,
                } as unknown as Space;

                const spaceDispatcher = new SpaceToFrontDispatcher(mockSpace, new EventProcessor());
                spaceDispatcher.handleMessage({
                    message: {
                        $case: "privateEvent",
                        privateEvent: {
                            spaceName: "test",
                            sender: SpaceUser.fromPartial({
                                spaceUserId: "foo_1",
                                uuid: "uuid-foo-1",
                            }),
                            receiverUserId: "foo_2",
                            spaceEvent: {
                                event: {
                                    $case: "muteVideo",
                                    muteVideo: {
                                        force: true,
                                    },
                                },
                            },
                        },
                    },
                });

                expect(mockEmitInBatch2).toHaveBeenCalledWith({
                    message: {
                        $case: "privateEvent",
                        privateEvent: {
                            spaceName: "test",
                            sender: {
                                ...SpaceUser.fromPartial({
                                    spaceUserId: "foo_1",
                                    uuid: "uuid-foo-1",
                                }),
                                lowercaseName: "",
                            },
                            receiverUserId: "foo_2",
                            spaceEvent: {
                                event: {
                                    $case: "muteVideo",
                                    muteVideo: {
                                        force: true,
                                    },
                                },
                            },
                        },
                    },
                });

                expect(mockEmitInBatch2).toHaveBeenCalledOnce();
                expect(mockEmitInBatch).not.toHaveBeenCalled();
                expect(mockEmitInBatch3).not.toHaveBeenCalled();
            });
        });
    });
    describe("notifyMe", () => {
        it("should notify the user", () => {
            const spaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
            });

            const spaceUser2 = SpaceUser.fromPartial({
                spaceUserId: "foo_2",
            });

            const mockEmitInBatch = vi.fn();

            const mockEmitInBatch2 = vi.fn();

            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUser: spaceUser,
                    emitInBatch: mockEmitInBatch,
                }),
            });

            const mockSocket2 = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUser: spaceUser2,
                    emitInBatch: mockEmitInBatch2,
                }),
            });

            const mockSpace = {
                name: "test",
                users: new Map<string, SpaceUser>([
                    ["foo_1", spaceUser],
                    ["foo_2", spaceUser2],
                ]),
                _localConnectedUser: new Map<string, Socket>([
                    ["foo_1", mockSocket],
                    ["foo_2", mockSocket2],
                ]),
                _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>([
                    [mockSocket, spaceUser],
                    [mockSocket2, spaceUser2],
                ]),
                _localWatchers: new Set<string>(),
                localName: "test",
            } as unknown as Space;

            const spaceDispatcher = new SpaceToFrontDispatcher(mockSpace, new EventProcessor());
            spaceDispatcher.notifyMe(mockSocket, {
                message: {
                    $case: "publicEvent",
                    publicEvent: {
                        spaceName: "test",
                        senderUserId: "foo_1",
                        spaceEvent: {
                            event: {
                                $case: "spaceMessage",
                                spaceMessage: {
                                    message: "test",
                                },
                            },
                        },
                    },
                },
            });

            expect(mockEmitInBatch).toHaveBeenCalledWith({
                message: {
                    $case: "publicEvent",
                    publicEvent: {
                        spaceName: "test",
                        senderUserId: "foo_1",
                        spaceEvent: {
                            event: {
                                $case: "spaceMessage",
                                spaceMessage: {
                                    message: "test",
                                },
                            },
                        },
                    },
                },
            });

            expect(mockEmitInBatch).toHaveBeenCalledOnce();
            expect(mockEmitInBatch2).not.toHaveBeenCalled();
        });
    });
    describe("notifyMeAddUser", () => {
        it("should notify the user", () => {
            const spaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
            });

            const spaceUser2 = SpaceUser.fromPartial({
                spaceUserId: "foo_2",
            });

            const mockEmitInBatch = vi.fn();

            const mockEmitInBatch2 = vi.fn();

            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUser: spaceUser,
                    emitInBatch: mockEmitInBatch,
                }),
            });

            const mockSocket2 = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUser: spaceUser2,
                    emitInBatch: mockEmitInBatch2,
                }),
            });

            const mockSpace = {
                name: "test",
                users: new Map<string, SpaceUser>([
                    ["foo_1", spaceUser],
                    ["foo_2", spaceUser2],
                ]),
                _localConnectedUser: new Map<string, Socket>([
                    ["foo_1", mockSocket],
                    ["foo_2", mockSocket2],
                ]),
                _localConnectedUserWithSpaceUser: new Map<Socket, SpaceUser>([
                    [mockSocket, spaceUser],
                    [mockSocket2, spaceUser2],
                ]),
                _localWatchers: new Set<string>(),
                localName: "test",
            } as unknown as Space;

            const spaceDispatcher = new SpaceToFrontDispatcher(mockSpace, new EventProcessor());
            spaceDispatcher.notifyMeAddUser(mockSocket, {
                ...spaceUser,
                lowercaseName: "foo_1",
            });

            expect(mockEmitInBatch).toHaveBeenCalledWith({
                message: {
                    $case: "addSpaceUserMessage",
                    addSpaceUserMessage: {
                        spaceName: "test",
                        user: {
                            ...spaceUser,
                            lowercaseName: "foo_1",
                        },
                    },
                },
            });

            expect(mockEmitInBatch).toHaveBeenCalledOnce();
            expect(mockEmitInBatch2).not.toHaveBeenCalled();
        });
    });
    describe("notifyAll", () => {
        it("should only notify users who are watching the space", () => {
            const spaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
            });

            const spaceUser2 = SpaceUser.fromPartial({
                spaceUserId: "foo_2",
            });

            const mockEmitInBatch = vi.fn();

            const mockEmitInBatch2 = vi.fn();

            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUser: spaceUser,
                    emitInBatch: mockEmitInBatch,
                }),
            });

            const mockSocket2 = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUser: spaceUser2,
                    emitInBatch: mockEmitInBatch2,
                }),
            });

            const mockSpace = {
                name: "test",
                users: new Map<string, SpaceUser>([
                    ["foo_1", spaceUser],
                    ["foo_2", spaceUser2],
                ]),
                _localConnectedUser: new Map<string, Socket>([
                    ["foo_1", mockSocket],
                    ["foo_2", mockSocket2],
                ]),
                _localWatchers: new Set<string>(["foo_1"]),
                localName: "test",
            } as unknown as Space;

            const spaceDispatcher = new SpaceToFrontDispatcher(mockSpace, new EventProcessor());
            spaceDispatcher.notifyAll({
                message: {
                    $case: "addSpaceUserMessage",
                    addSpaceUserMessage: {
                        spaceName: "test",
                        user: {
                            ...spaceUser,
                        },
                    },
                },
            });

            expect(mockEmitInBatch).toHaveBeenCalledWith({
                message: {
                    $case: "addSpaceUserMessage",
                    addSpaceUserMessage: {
                        spaceName: "test",
                        user: {
                            ...spaceUser,
                        },
                    },
                },
            });

            expect(mockEmitInBatch).toHaveBeenCalledOnce();
            expect(mockEmitInBatch2).not.toHaveBeenCalled();

            mockSpace._localWatchers.add("foo_2");

            spaceDispatcher.notifyAll({
                message: {
                    $case: "addSpaceUserMessage",
                    addSpaceUserMessage: {
                        spaceName: "test",
                        user: {
                            ...spaceUser2,
                        },
                    },
                },
            });

            expect(mockEmitInBatch2).toHaveBeenCalledWith({
                message: {
                    $case: "addSpaceUserMessage",
                    addSpaceUserMessage: {
                        spaceName: "test",
                        user: {
                            ...spaceUser2,
                        },
                    },
                },
            });

            expect(mockEmitInBatch2).toHaveBeenCalledOnce();
        });
    });
});
