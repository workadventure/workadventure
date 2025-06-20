import { FilterType, SpaceUser } from "@workadventure/messages";
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

vi.mock("../../../../Enum/EnvironmentVariable.ts", () => {
    return {
        API_URL: "http://localhost:3000",
    };
});

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

            const mockWriteFunction = vi.fn();

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
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

            const mockWriteFunction = vi.fn();

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
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

            const mockWriteFunction = vi.fn();

            const mockBackSpaceConnection = mock<BackSpaceConnection>({
                write: mockWriteFunction,
                on: vi.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
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
