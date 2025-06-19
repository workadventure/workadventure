import { FilterType, PusherToBackSpaceMessage, SpaceUser, SubMessage } from "@workadventure/messages";
import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { ApiClientRepository } from "@workadventure/shared-utils/src/ApiClientRepository";
import { EventProcessor } from "../../src/pusher/models/EventProcessor";
import { Space, SpaceUserExtended } from "../../src/pusher/models/Space";
import { BackSpaceConnection } from "../../src/pusher/models/Websocket/SocketData";
import { Socket } from "../../src/pusher/services/SocketManager";
import { SpaceToFrontDispatcher } from "../../src/pusher/models/SpaceToFrontDispatcher";
import { SpaceToBackForwarder } from "../../src/pusher/models/SpaceToBackForwarder";

const flushPromises = () => new Promise(setImmediate);

//TODO : split the tests into smaller files
//TODO : see if there are not too many repetitions in the tests

describe("Space", () => {
    /* 
     Test unwatch and isEmpty ??
     */

    describe("initSpace", () => {
        //TODO : do the same test for pingTimeout ?
        it("should try to reconnect to back if the connection is lost and send local users to back", async () => {
            const callbackMap = new Map<string, (...args: unknown[]) => void>();

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: vi.fn(),
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    console.log("on", event);
                    callbackMap.set(event, callback);
                    return mockBackSpaceConnection;
                }),
            });

            const mockWatchSpace = vi.fn().mockReturnValue(mockBackSpaceConnection);

            const mockGetSpaceClient = vi.fn().mockResolvedValue({
                watchSpace: mockWatchSpace,
            });

            const mockApiClientRepository = mock<ApiClientRepository>({
                getSpaceClient: mockGetSpaceClient,
            });

            const mockUsers = [
                SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                }),
                SpaceUser.fromPartial({
                    spaceUserId: "foo_2",
                }),
                SpaceUser.fromPartial({
                    spaceUserId: "foo_3",
                }),
            ];

            const mockSyncLocalUsersWithServer = vi.fn();

            const mockSpaceToBackForwarderFactory = (space: Space) =>
                ({
                    syncLocalUsersWithServer: mockSyncLocalUsersWithServer,
                } as unknown as SpaceToBackForwarder);

            const mockSpaceToFrontDispatcherFactory = (space: Space, eventProcessor: EventProcessor) =>
                ({} as SpaceToFrontDispatcher);

            const space = new Space(
                "test",
                "test",
                new EventProcessor(),
                FilterType.ALL_USERS,
                mockApiClientRepository,
                mockSpaceToBackForwarderFactory,
                mockSpaceToFrontDispatcherFactory
            );

            space.initSpace();
            space._localConnectedUser.set("foo_1", {
                getUserData: vi.fn().mockReturnValue({
                    spaceUser: mockUsers[0],
                }),
            } as unknown as Socket);
            space._localConnectedUser.set("foo_2", {
                getUserData: vi.fn().mockReturnValue({
                    spaceUser: mockUsers[1],
                }),
            } as unknown as Socket);
            space._localConnectedUser.set("foo_3", {
                getUserData: vi.fn().mockReturnValue({
                    spaceUser: mockUsers[2],
                }),
            } as unknown as Socket);

            await flushPromises();

            expect(mockGetSpaceClient).toHaveBeenCalledOnce();
            expect(mockWatchSpace).toHaveBeenCalledOnce();

            //Simuler une erreur de connection
            callbackMap.get("end")?.();

            await flushPromises();

            expect(mockGetSpaceClient).toHaveBeenCalledTimes(2);
            expect(mockWatchSpace).toHaveBeenCalledTimes(2);
            expect(mockSyncLocalUsersWithServer).toHaveBeenCalledOnce();
            expect(mockSyncLocalUsersWithServer).toHaveBeenCalledWith(mockUsers);
        });

        it("should send joinSpaceMessage to back when initSpace is called", async () => {
            const callbackMap = new Map<string, (...args: unknown[]) => void>();

            const mockWriteFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                console.log("write", message);
            });

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    console.log("on", event);
                    callbackMap.set(event, callback);
                    return mockBackSpaceConnection;
                }),
            });

            const mockWatchSpace = vi.fn().mockReturnValue(mockBackSpaceConnection);

            const mockGetSpaceClient = vi.fn().mockResolvedValue({
                watchSpace: mockWatchSpace,
            });

            const mockApiClientRepository = mock<ApiClientRepository>({
                getSpaceClient: mockGetSpaceClient,
            });

            const mockSyncLocalUsersWithServer = vi.fn();

            const mockSpaceToBackForwarderFactory = (space: Space) =>
                ({
                    syncLocalUsersWithServer: mockSyncLocalUsersWithServer,
                } as unknown as SpaceToBackForwarder);

            const mockSpaceToFrontDispatcherFactory = (space: Space, eventProcessor: EventProcessor) =>
                ({} as SpaceToFrontDispatcher);

            const space = new Space(
                "test",
                "test",
                new EventProcessor(),
                FilterType.ALL_USERS,
                mockApiClientRepository,
                mockSpaceToBackForwarderFactory,
                mockSpaceToFrontDispatcherFactory
            );

            space.initSpace();
            await flushPromises();

            expect(mockWriteFunction).toHaveBeenCalledWith({
                message: {
                    $case: "joinSpaceMessage",
                    joinSpaceMessage: { spaceName: "test", filterType: FilterType.ALL_USERS },
                },
            });
            expect(mockWriteFunction).toHaveBeenCalledOnce();
        });
    });
    describe("closeBackConnection", () => {
        it("should close the back connection", async () => {
            const callbackMap = new Map<string, (...args: unknown[]) => void>();
            const mockEndFunction = vi.fn();
            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: vi.fn(),
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    console.log("on", event);
                    callbackMap.set(event, callback);
                    return mockBackSpaceConnection;
                }),
                end: mockEndFunction,
            });

            const mockWatchSpace = vi.fn().mockReturnValue(mockBackSpaceConnection);

            const mockGetSpaceClient = vi.fn().mockResolvedValue({
                watchSpace: mockWatchSpace,
            });

            const mockApiClientRepository = mock<ApiClientRepository>({
                getSpaceClient: mockGetSpaceClient,
            });

            const mockUsers = [
                SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                }),
                SpaceUser.fromPartial({
                    spaceUserId: "foo_2",
                }),
                SpaceUser.fromPartial({
                    spaceUserId: "foo_3",
                }),
            ];

            const mockSyncLocalUsersWithServer = vi.fn();

            const mockSpaceToBackForwarderFactory = (space: Space) =>
                ({
                    syncLocalUsersWithServer: mockSyncLocalUsersWithServer,
                } as unknown as SpaceToBackForwarder);

            const mockSpaceToFrontDispatcherFactory = (space: Space, eventProcessor: EventProcessor) =>
                ({} as SpaceToFrontDispatcher);

            const space = new Space(
                "test",
                "test",
                new EventProcessor(),
                FilterType.ALL_USERS,
                mockApiClientRepository,
                mockSpaceToBackForwarderFactory,
                mockSpaceToFrontDispatcherFactory
            );

            space.initSpace();
            space._localConnectedUser.set("foo_1", {
                getUserData: vi.fn().mockReturnValue({
                    spaceUser: mockUsers[0],
                }),
            } as unknown as Socket);
            space._localConnectedUser.set("foo_2", {
                getUserData: vi.fn().mockReturnValue({
                    spaceUser: mockUsers[1],
                }),
            } as unknown as Socket);
            space._localConnectedUser.set("foo_3", {
                getUserData: vi.fn().mockReturnValue({
                    spaceUser: mockUsers[2],
                }),
            } as unknown as Socket);

            space.closeBackConnection();
            await flushPromises();

            expect(mockEndFunction).toHaveBeenCalledOnce();
        });
    });

    describe("handleWatch", () => {
        it("should send all users to the new watcher", async () => {
            const callbackMap = new Map<string, (...args: unknown[]) => void>();

            const mockWriteFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                console.log("write", message);
            });

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    console.log("on", event);
                    callbackMap.set(event, callback);
                    return mockBackSpaceConnection;
                }),
            });

            const mockWatchSpace = vi.fn().mockReturnValue(mockBackSpaceConnection);

            const mockGetSpaceClient = vi.fn().mockResolvedValue({
                watchSpace: mockWatchSpace,
            });

            const mockApiClientRepository = mock<ApiClientRepository>({
                getSpaceClient: mockGetSpaceClient,
            });

            const mockUsers = [
                SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                }),
                SpaceUser.fromPartial({
                    spaceUserId: "foo_2",
                }),
                SpaceUser.fromPartial({
                    spaceUserId: "foo_3",
                }),
            ];

            const mockSyncLocalUsersWithServer = vi.fn();

            const mockSpaceToBackForwarderFactory = (space: Space) =>
                ({
                    syncLocalUsersWithServer: mockSyncLocalUsersWithServer,
                } as unknown as SpaceToBackForwarder);

            const mockNotifyMeAddUser = vi.fn();
            const mockSpaceToFrontDispatcherFactory = (space: Space, eventProcessor: EventProcessor) =>
                ({
                    notifyMeAddUser: mockNotifyMeAddUser,
                } as unknown as SpaceToFrontDispatcher);

            const space = new Space(
                "test",
                "test",
                new EventProcessor(),
                FilterType.ALL_USERS,
                mockApiClientRepository,
                mockSpaceToBackForwarderFactory,
                mockSpaceToFrontDispatcherFactory
            );

            space.initSpace();

            space.users.set("foo_1", mockUsers[0] as SpaceUserExtended);
            space.users.set("foo_2", mockUsers[1] as SpaceUserExtended);
            space.users.set("foo_3", mockUsers[2] as SpaceUserExtended);

            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUser: mockUsers[0],
                }),
            });

            await flushPromises();

            space.handleWatch(mockSocket);

            expect(mockNotifyMeAddUser).toHaveBeenNthCalledWith(1, mockSocket, mockUsers[0]);
            expect(mockNotifyMeAddUser).toHaveBeenNthCalledWith(2, mockSocket, mockUsers[1]);
            expect(mockNotifyMeAddUser).toHaveBeenNthCalledWith(3, mockSocket, mockUsers[2]);
            expect(mockNotifyMeAddUser).toHaveBeenCalledTimes(3);
        });

        it("should not send users to the new watcher if the user is already watching the space", async () => {
            const callbackMap = new Map<string, (...args: unknown[]) => void>();

            const mockWriteFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                console.log("write", message);
            });

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    console.log("on", event);
                    callbackMap.set(event, callback);
                    return mockBackSpaceConnection;
                }),
            });

            const mockWatchSpace = vi.fn().mockReturnValue(mockBackSpaceConnection);

            const mockGetSpaceClient = vi.fn().mockResolvedValue({
                watchSpace: mockWatchSpace,
            });

            const mockApiClientRepository = mock<ApiClientRepository>({
                getSpaceClient: mockGetSpaceClient,
            });

            const mockUsers = [
                SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                }),
                SpaceUser.fromPartial({
                    spaceUserId: "foo_2",
                }),
                SpaceUser.fromPartial({
                    spaceUserId: "foo_3",
                }),
            ];

            const mockSyncLocalUsersWithServer = vi.fn();

            const mockSpaceToBackForwarderFactory = (space: Space) =>
                ({
                    syncLocalUsersWithServer: mockSyncLocalUsersWithServer,
                } as unknown as SpaceToBackForwarder);

            const mockNotifyMeAddUser = vi.fn();
            const mockSpaceToFrontDispatcherFactory = (space: Space, eventProcessor: EventProcessor) =>
                ({
                    notifyMeAddUser: mockNotifyMeAddUser,
                } as unknown as SpaceToFrontDispatcher);

            const space = new Space(
                "test",
                "test",
                new EventProcessor(),
                FilterType.ALL_USERS,
                mockApiClientRepository,
                mockSpaceToBackForwarderFactory,
                mockSpaceToFrontDispatcherFactory
            );

            space.initSpace();

            space.users.set("foo_1", mockUsers[0] as SpaceUserExtended);
            space.users.set("foo_2", mockUsers[1] as SpaceUserExtended);
            space.users.set("foo_3", mockUsers[2] as SpaceUserExtended);
            space._localWatchers.add("foo_1");

            const mockSocket = mock<Socket>({
                getUserData: vi.fn().mockReturnValue({
                    spaceUser: mockUsers[0],
                }),
            });

            await flushPromises();

            space.handleWatch(mockSocket);

            expect(mockNotifyMeAddUser).not.toHaveBeenCalled();
        });
    });
});

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

            const mockWriteFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                console.log("write", message);
            });

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    console.log("on", event);
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

            const mockWriteFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                console.log("write", message);
            });

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    console.log("on", event);
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

            const mockNotifyMeFunction = vi.fn().mockImplementation((socket: Socket, message: SubMessage) => {
                console.log("notifyMe", message);
            });

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

            const mockWriteFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                console.log("write", message);
            });

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    console.log("on", event);
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

            const mockNotifyMeFunction = vi.fn().mockImplementation((socket: Socket, message: SubMessage) => {
                console.log("notifyMe", message);
            });

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

            const mockWriteFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                console.log("write", message);
            });

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    console.log("on", event);
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

            const mockWriteFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                console.log("write", message);
            });

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    console.log("on", event);
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

            const mockWriteFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                console.log("write", message);
            });

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    console.log("on", event);
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

            const mockWriteFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                console.log("write", message);
            });

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    console.log("on", event);
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

            const mockWriteFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                console.log("write", message);
            });

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    console.log("on", event);
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

            const mockWriteFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                console.log("write", message);
            });

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    console.log("on", event);
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

            const mockWriteFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                console.log("write", message);
            });

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    console.log("on", event);
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

            const mockWriteFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                console.log("write", message);
            });

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    console.log("on", event);
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

            const mockWriteFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                console.log("write", message);
            });

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    console.log("on", event);
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

            const mockWriteFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                console.log("write", message);
            });

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                    console.log("on", event);
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

describe("SpaceToFrontDispatcher", () => {
    describe("handleMessage", () => {
        describe("addSpaceUserMessage", () => {
            it("should throw when the space user already exists", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {
                    console.log("emitInBatch", message);
                });

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

                const mockWriteFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                    console.log("write", message);
                });

                const mockBackSpaceConnection = mock<BackSpaceConnection>({
                    write: mockWriteFunction,
                    on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                        console.log("on", event);
                        callbackMap.set(event, callback);
                        return mockBackSpaceConnection;
                    }),
                });

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {
                    console.log("emitInBatch", message);
                });

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
            it("should throw error when user not found in space", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {
                    console.log("emitInBatch", message);
                });

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

                const mockWriteFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                    console.log("write", message);
                });

                const mockBackSpaceConnection = mock<BackSpaceConnection>({
                    write: mockWriteFunction,
                    on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                        console.log("on", event);
                        callbackMap.set(event, callback);
                        return mockBackSpaceConnection;
                    }),
                });

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {
                    console.log("emitInBatch", message);
                });

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
            it("should throw error when user not found in space", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {
                    console.log("emitInBatch", message);
                });

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

                const mockWriteFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                    console.log("write", message);
                });

                const mockBackSpaceConnection = mock<BackSpaceConnection>({
                    write: mockWriteFunction,
                    on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                        console.log("on", event);
                        callbackMap.set(event, callback);
                        return mockBackSpaceConnection;
                    }),
                });

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {
                    console.log("emitInBatch", message);
                });

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

                const mockWriteFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                    console.log("write", message);
                });

                const mockBackSpaceConnection = mock<BackSpaceConnection>({
                    write: mockWriteFunction,
                    on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
                        console.log("on", event);
                        callbackMap.set(event, callback);
                        return mockBackSpaceConnection;
                    }),
                });

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {
                    console.log("emitInBatch", message);
                });

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
            it("should throw error because it should not be received by the dispatcher - pingMessage should be handle by the space class", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {
                    console.log("emitInBatch", message);
                });

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

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {
                    console.log("emitInBatch", message);
                });

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockForwardToBackFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                    console.log("forwardMessageToSpaceBack", message);
                });
                const mockForwarder = mock<SpaceToBackForwarder>({
                    forwardMessageToSpaceBack: mockForwardToBackFunction,
                });
                const mockSpace = {
                    name: "test",
                    users: new Map<string, SpaceUser>(),
                    _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
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
                            filterName: "test",
                        },
                    },
                });

                expect(mockForwardToBackFunction).toHaveBeenCalledWith({
                    $case: "kickOffMessage",
                    kickOffMessage: {
                        spaceName: "test",
                        userId: "foo_1",
                        filterName: "test",
                    },
                });
            });
        });
        describe("publicEvent", () => {
            it("should throw error if the event is not defined", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {
                    console.log("emitInBatch", message);
                });

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockForwardToBackFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                    console.log("forwardMessageToSpaceBack", message);
                });
                const mockForwarder = mock<SpaceToBackForwarder>({
                    forwardMessageToSpaceBack: mockForwardToBackFunction,
                });
                const mockSpace = {
                    name: "test",
                    users: new Map<string, SpaceUser>([["foo_1", spaceUser]]),
                    _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
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
            it("should throw error if the sender is not found in the space", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {
                    console.log("emitInBatch", message);
                });

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockForwardToBackFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                    console.log("forwardMessageToSpaceBack", message);
                });
                const mockForwarder = mock<SpaceToBackForwarder>({
                    forwardMessageToSpaceBack: mockForwardToBackFunction,
                });
                const mockSpace = {
                    name: "test",
                    users: new Map<string, SpaceUser>([["foo_1", spaceUser]]),
                    _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
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

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {
                    console.log("emitInBatch", message);
                });
                const mockEmitInBatch2 = vi.fn().mockImplementation((message: SubMessage) => {
                    console.log("emitInBatch2", message);
                });

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

                const mockForwardToBackFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                    console.log("forwardMessageToSpaceBack", message);
                });
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
            it("should throw error if the event is not defined", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {
                    console.log("emitInBatch", message);
                });

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockForwardToBackFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                    console.log("forwardMessageToSpaceBack", message);
                });
                const mockForwarder = mock<SpaceToBackForwarder>({
                    forwardMessageToSpaceBack: mockForwardToBackFunction,
                });
                const mockSpace = {
                    name: "test",
                    users: new Map<string, SpaceUser>([["foo_1", spaceUser]]),
                    _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
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
                            senderUserId: "foo_1",
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
            it("should throw error if the receiver is not found in the space", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {
                    console.log("emitInBatch", message);
                });

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockForwardToBackFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                    console.log("forwardMessageToSpaceBack", message);
                });
                const mockForwarder = mock<SpaceToBackForwarder>({
                    forwardMessageToSpaceBack: mockForwardToBackFunction,
                });
                const mockSpace = {
                    name: "test",
                    users: new Map<string, SpaceUser>([["foo_1", spaceUser]]),
                    _localConnectedUser: new Map<string, Socket>([["foo_1", mockSocket]]),
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
                            senderUserId: "foo_1",
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
            it("should throw error if the sender is not found in the space", () => {
                const spaceUser = SpaceUser.fromPartial({
                    spaceUserId: "foo_1",
                });

                const spaceUser2 = SpaceUser.fromPartial({
                    spaceUserId: "foo_2",
                });

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {
                    console.log("emitInBatch", message);
                });

                const mockSocket = mock<Socket>({
                    getUserData: vi.fn().mockReturnValue({
                        spaceUser: spaceUser,
                        emitInBatch: mockEmitInBatch,
                    }),
                });

                const mockForwardToBackFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                    console.log("forwardMessageToSpaceBack", message);
                });
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
                            senderUserId: "falseSenderId",
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

                const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {
                    console.log("emitInBatch", message);
                });
                const mockEmitInBatch2 = vi.fn().mockImplementation((message: SubMessage) => {
                    console.log("emitInBatch2", message);
                });

                const mockEmitInBatch3 = vi.fn().mockImplementation((message: SubMessage) => {
                    console.log("emitInBatch3", message);
                });

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

                const mockForwardToBackFunction = vi.fn().mockImplementation((message: PusherToBackSpaceMessage) => {
                    console.log("forwardMessageToSpaceBack", message);
                });
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
                            senderUserId: "foo_1",
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
                            senderUserId: "foo_1",
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

            const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {
                console.log("emitInBatch", message);
            });

            const mockEmitInBatch2 = vi.fn().mockImplementation((message: SubMessage) => {
                console.log("emitInBatch2", message);
            });

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

            const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {
                console.log("emitInBatch", message);
            });

            const mockEmitInBatch2 = vi.fn().mockImplementation((message: SubMessage) => {
                console.log("emitInBatch2", message);
            });

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

            const mockEmitInBatch = vi.fn().mockImplementation((message: SubMessage) => {
                console.log("emitInBatch", message);
            });

            const mockEmitInBatch2 = vi.fn().mockImplementation((message: SubMessage) => {
                console.log("emitInBatch2", message);
            });

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
