import { describe, expect, it, vi } from "vitest";
import { SpaceUser } from "@workadventure/messages";
import { get } from "svelte/store";
import { SpaceUserExtended } from "../SpaceFilter/SpaceFilter";
import { RoomConnection } from "../../Connection/RoomConnection";
import { AllUsersSpaceFilter } from "../SpaceFilter/AllUsersSpaceFilter";
import { PeerFactoryInterface, Space } from "../Space";

const defaultRoomConnectionMock = {
    emitUserJoinSpace: vi.fn(),
    emitAddSpaceFilter: vi.fn(),
    emitJoinSpace: vi.fn(),
    emitRemoveSpaceFilter: vi.fn(),
} as unknown as RoomConnection;

// const defaultPeerStoreMock = {
//     getSpaceStore: vi.fn(),
//     cleanupStore: vi.fn(),
//     removePeer: vi.fn(),
//     getPeer: vi.fn(),
// };

// Mock the PeerStore module
vi.mock("../../Stores/PeerStore", () => ({
    peerStore: {
        getSpaceStore: vi.fn(),
        cleanupStore: vi.fn(),
        removePeer: vi.fn(),
        getPeer: vi.fn(),
    },
    screenSharingPeerStore: {
        getSpaceStore: vi.fn(),
        cleanupStore: vi.fn(),
        removePeer: vi.fn(),
        getPeer: vi.fn(),
    },
}));
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
// Mock SimplePeer
vi.mock("../../WebRtc/SimplePeer", () => ({
    SimplePeer: vi.fn().mockImplementation(() => ({
        closeAllConnections: vi.fn(),
        destroy: vi.fn(),
    })),
}));

const defaultPeerFactoryMock = {
    create: vi.fn(),
} as unknown as PeerFactoryInterface;

describe("SpaceFilter", () => {
    describe("addUser", () => {
        //not throw a error because this function is call when you receive a message by the pusher
        it("should add user when user is not exist in list  ", async () => {
            const spaceFilterName = "space-filter-name";
            const space = new Space(
                "space-name",
                new Map<string, unknown>(),
                defaultRoomConnectionMock,
                [],
                defaultPeerFactoryMock
            );
            const id = 0;
            const user: Pick<SpaceUserExtended, "id"> = {
                id,
            };

            const spaceFilter = new AllUsersSpaceFilter(spaceFilterName, space, defaultRoomConnectionMock);
            await spaceFilter.addUser(user as SpaceUserExtended);
            expect(get(spaceFilter.usersStore).has(user.id)).toBeTruthy();
        });

        it("should not overwrite user when you add a new user and he already exist", async () => {
            const spaceFilterName = "space-filter-name";
            const space = new Space(
                "space-name",
                new Map<string, unknown>(),
                defaultRoomConnectionMock,
                [],
                defaultPeerFactoryMock
            );
            const id = 1;

            const spaceFilter = new AllUsersSpaceFilter(spaceFilterName, space, defaultRoomConnectionMock);
            await spaceFilter.addUser({
                id,
                name: "user-name",
            } as unknown as SpaceUserExtended);
            await spaceFilter.addUser({
                id,
                name: "user-name-overloaded",
            } as unknown as SpaceUserExtended);

            const userInStore = get(spaceFilter.usersStore).get(id);

            expect(userInStore?.id).toEqual(id);
            expect(userInStore?.name).toBe("user-name");
        });
    });
    describe("updateUserData", () => {
        it("should not update userdata when user object do not have id ", async () => {
            const spaceFilterName = "space-name";
            const space = new Space(
                "space-name",
                new Map<string, unknown>(),
                defaultRoomConnectionMock,
                [],
                defaultPeerFactoryMock
            );
            const id = 0;

            const user: Pick<SpaceUserExtended, "id" | "name"> = {
                id,
                name: "user-1",
            };

            const newData: SpaceUserExtended = {
                name: "user-2",
                availabilityStatus: 1,
                roomName: "world",
            } as SpaceUserExtended;

            const spaceFilter = new AllUsersSpaceFilter(spaceFilterName, space, defaultRoomConnectionMock);

            await spaceFilter.addUser(user as SpaceUserExtended);
            spaceFilter.updateUserData(newData, ["name", "availabilityStatus", "roomName"]);

            const storedUser = get(spaceFilter.usersStore).get(id);
            expect(storedUser).toBeDefined();
            expect(storedUser?.id).toBe(id);
            expect(storedUser?.name).toBe(user.name);
        });
        it("should update user data when user object have a id ", async () => {
            const spaceFilterName = "space-filter-name";
            const space = new Space(
                "space-name",
                new Map<string, unknown>(),
                defaultRoomConnectionMock,
                [],
                defaultPeerFactoryMock
            );
            const id = 0;

            const user: Pick<SpaceUserExtended, "id" | "name"> = {
                id,
                name: "user-1",
            };

            const newData: SpaceUserExtended = {
                id,
                name: "user-2",
                availabilityStatus: 1,
                roomName: "world",
            } as SpaceUserExtended;

            const updatedUserResult = {
                ...user,
                ...newData,
            };

            const spaceFilter = new AllUsersSpaceFilter(spaceFilterName, space, defaultRoomConnectionMock);

            await spaceFilter.addUser(user as SpaceUserExtended);
            spaceFilter.updateUserData(newData, ["name", "availabilityStatus", "roomName"]);

            const updatedUser = get(spaceFilter.usersStore).get(id);

            expect(updatedUser?.id).toBe(id);
            expect(updatedUser?.name).toBe(updatedUserResult.name);
            expect(updatedUser?.availabilityStatus).toBe(updatedUserResult.availabilityStatus);
            expect(updatedUser?.roomName).toBe(updatedUserResult.roomName);
        });
        it("should not update userdata when user object have a incorrect id ", async () => {
            const spaceFilterName = "space-filter-name";
            const space = new Space(
                "space-name",
                new Map<string, unknown>(),
                defaultRoomConnectionMock,
                [],
                defaultPeerFactoryMock
            );
            const id = 0;

            const user: Pick<SpaceUserExtended, "id" | "name"> = {
                id,
                name: "user-1",
            };

            const newData: SpaceUser = {
                id: 404,
                name: "user-2",
                availabilityStatus: 1,
                roomName: "world",
            } as SpaceUser;

            const spaceFilter = new AllUsersSpaceFilter(spaceFilterName, space, defaultRoomConnectionMock);

            await spaceFilter.addUser(user as SpaceUserExtended);
            spaceFilter.updateUserData(newData, ["name", "availabilityStatus", "roomName"]);

            const updatedUser = get(spaceFilter.usersStore).get(id);

            expect(updatedUser?.name).toBe(user.name);
        });
    });

    describe("emitFilterEvent", () => {
        it("emit addSpaceFilter event when you create spaceFilter", () => {
            const spaceFilterName = "space-filter-name";
            const space = new Space(
                "space-name",
                new Map<string, unknown>(),
                defaultRoomConnectionMock,
                [],
                defaultPeerFactoryMock
            );

            const mockRoomConnection = {
                emitAddSpaceFilter: vi.fn(),
                emitRemoveSpaceFilter: vi.fn(),
                emitJoinSpace: vi.fn(),
            } as unknown as RoomConnection;

            const spaceFilter = new AllUsersSpaceFilter(spaceFilterName, space, mockRoomConnection);

            const unsubscribe = spaceFilter.usersStore.subscribe(() => {});

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockRoomConnection.emitAddSpaceFilter).toHaveBeenCalledOnce();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockRoomConnection.emitAddSpaceFilter).toHaveBeenCalledWith({
                spaceFilterMessage: {
                    filterName: spaceFilterName,
                    spaceName: space.getName(),
                    filter: {
                        $case: "spaceFilterEverybody",
                        spaceFilterEverybody: {},
                    },
                },
            });

            unsubscribe();
        });

        it("emit removeSpaceFilter event when you stop listening to a spaceFilter", () => {
            const spaceFilterName = "space-filter-name";
            const space = new Space(
                "space-name",
                new Map<string, unknown>(),
                defaultRoomConnectionMock,
                [],
                defaultPeerFactoryMock
            );

            const mockRoomConnection = {
                emitAddSpaceFilter: vi.fn(),
                emitRemoveSpaceFilter: vi.fn(),
            } as unknown as RoomConnection;

            const spaceFilter = new AllUsersSpaceFilter(spaceFilterName, space, mockRoomConnection);
            const unsubscribe = spaceFilter.usersStore.subscribe(() => {});
            unsubscribe();

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockRoomConnection.emitRemoveSpaceFilter).toHaveBeenCalledOnce();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockRoomConnection.emitRemoveSpaceFilter).toHaveBeenLastCalledWith({
                spaceFilterMessage: {
                    filterName: spaceFilterName,
                    spaceName: space.getName(),
                },
            });
        });
        it("emit updateSpaceFilter event when you update spaceFilter", () => {
            const spaceFilterName = "space-filter-name";
            const space = new Space(
                "space-name",
                new Map<string, unknown>(),
                defaultRoomConnectionMock,
                [],
                defaultPeerFactoryMock
            );

            const mockRoomConnection = {
                emitAddSpaceFilter: vi.fn(),
                emitUpdateSpaceFilter: vi.fn(),
                emitRemoveSpaceFilter: vi.fn(),
            } as unknown as RoomConnection;

            const spaceFilter = new AllUsersSpaceFilter(spaceFilterName, space, mockRoomConnection);

            const unsubscribe = spaceFilter.usersStore.subscribe(() => {});

            spaceFilter.filterByName("foo");

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockRoomConnection.emitUpdateSpaceFilter).toHaveBeenCalledOnce();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockRoomConnection.emitUpdateSpaceFilter).toHaveBeenLastCalledWith({
                spaceFilterMessage: {
                    filterName: spaceFilterName,
                    spaceName: space.getName(),
                    filter: {
                        $case: "spaceFilterContainName",
                        spaceFilterContainName: {
                            value: "foo",
                        },
                    },
                },
            });

            unsubscribe();
        });
    });
});
