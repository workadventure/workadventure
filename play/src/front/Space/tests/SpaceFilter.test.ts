import { describe, expect, it, vi } from "vitest";
import { FilterType, SpaceUser } from "@workadventure/messages";
import { get } from "svelte/store";
import { RoomConnection } from "../../Connection/RoomConnection";
import { Space } from "../Space";
import { SpaceUserExtended } from "../SpaceInterface";

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
    screenSharingPeerStore: {
        getSpaceStore: vi.fn(),
        cleanupStore: vi.fn(),
        removePeer: vi.fn(),
        getPeer: vi.fn(),
    },
    videoStreamStore: {
        subscribe: vi.fn().mockImplementation(() => {
            return () => {};
        }),
    },
    videoStreamElementsStore: {
        subscribe: vi.fn().mockImplementation(() => {
            return () => {};
        }),
    },
    screenShareStreamElementsStore: {
        subscribe: vi.fn().mockImplementation(() => {
            return () => {};
        }),
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
            getCurrentGameScene: () => ({
                getRemotePlayersRepository: vi.fn(),
            }),
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

vi.mock("../../Enum/EnvironmentVariable.ts", () => {
    return {
        MATRIX_ADMIN_USER: "admin",
        MATRIX_DOMAIN: "domain",
        STUN_SERVER: "stun:test.com:19302",
        TURN_SERVER: "turn:test.com:19302",
        TURN_USER: "user",
        TURN_PASSWORD: "password",
        POSTHOG_API_KEY: "test-api-key",
        POSTHOG_URL: "https://test.com",
        MAX_USERNAME_LENGTH: 10,
        PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH: 1000,
        PEER_VIDEO_RECOMMENDED_BANDWIDTH: 1000,
    };
});

describe("SpaceFilter", () => {
    describe("addUser", () => {
        //not throw a error because this function is call when you receive a message by the pusher
        it("should add user when user is not exist in list  ", async () => {
            const space = await Space.create(
                "space-name",
                FilterType.ALL_USERS,
                defaultRoomConnectionMock,
                [],
                new Map<string, unknown>()
            );
            const spaceUserId = "foo_0";
            const user: Pick<SpaceUserExtended, "spaceUserId"> = {
                spaceUserId,
            };

            await space.addUser(user as SpaceUserExtended);
            expect(get(space.usersStore).has(user.spaceUserId)).toBeTruthy();
        });

        it("should not overwrite user when you add a new user and he already exists", async () => {
            const space = await Space.create(
                "space-name",
                FilterType.ALL_USERS,
                defaultRoomConnectionMock,
                [],
                new Map<string, unknown>()
            );
            const spaceUserId = "foo_1";

            await space.addUser({
                spaceUserId,
                name: "user-name",
            } as unknown as SpaceUserExtended);
            await space.addUser({
                spaceUserId,
                name: "user-name-overloaded",
            } as unknown as SpaceUserExtended);

            const userInStore = get(space.usersStore).get(spaceUserId);

            expect(userInStore?.spaceUserId).toEqual(spaceUserId);
            expect(userInStore?.name).toBe("user-name");
        });
    });
    describe("updateUserData", () => {
        it("should not update userdata when user object do not have id ", async () => {
            const space = await Space.create(
                "space-name",
                FilterType.ALL_USERS,
                defaultRoomConnectionMock,
                [],
                new Map<string, unknown>()
            );
            const spaceUserId = "";

            const user: Pick<SpaceUserExtended, "spaceUserId" | "name"> = {
                spaceUserId,
                name: "user-1",
            };

            const newData: SpaceUserExtended = {
                name: "user-2",
                availabilityStatus: 1,
                roomName: "world",
            } as SpaceUserExtended;

            await space.addUser(user as SpaceUserExtended);
            space.updateUserData(newData, ["name", "availabilityStatus", "roomName"]);

            const storedUser = get(space.usersStore).get(spaceUserId);
            expect(storedUser).toBeDefined();
            expect(storedUser?.spaceUserId).toBe(spaceUserId);
            expect(storedUser?.name).toBe(user.name);
        });
        it("should update user data when user object have a id ", async () => {
            const space = await Space.create(
                "space-name",
                FilterType.ALL_USERS,
                defaultRoomConnectionMock,
                [],
                new Map<string, unknown>()
            );
            const spaceUserId = "";

            const user: Pick<SpaceUserExtended, "spaceUserId" | "name"> = {
                spaceUserId,
                name: "user-1",
            };

            const newData: SpaceUserExtended = {
                spaceUserId,
                name: "user-2",
                availabilityStatus: 1,
                roomName: "world",
            } as SpaceUserExtended;

            const updatedUserResult = {
                ...user,
                ...newData,
            };

            await space.addUser(user as SpaceUserExtended);
            space.updateUserData(newData, ["name", "availabilityStatus", "roomName"]);

            const updatedUser = get(space.usersStore).get(spaceUserId);

            expect(updatedUser?.spaceUserId).toBe(spaceUserId);
            expect(updatedUser?.name).toBe(updatedUserResult.name);
            expect(updatedUser?.availabilityStatus).toBe(updatedUserResult.availabilityStatus);
            expect(updatedUser?.roomName).toBe(updatedUserResult.roomName);
        });
        it("should not update userdata when user object have a incorrect id ", async () => {
            const space = await Space.create(
                "space-name",
                FilterType.ALL_USERS,
                defaultRoomConnectionMock,
                [],
                new Map<string, unknown>()
            );
            const spaceUserId = "";

            const user: Pick<SpaceUserExtended, "spaceUserId" | "name"> = {
                spaceUserId,
                name: "user-1",
            };

            const newData: SpaceUser = {
                spaceUserId: "foo_404",
                name: "user-2",
                availabilityStatus: 1,
                roomName: "world",
            } as SpaceUser;

            await space.addUser(user as SpaceUserExtended);
            space.updateUserData(newData, ["name", "availabilityStatus", "roomName"]);

            const updatedUser = get(space.usersStore).get(spaceUserId);

            expect(updatedUser?.name).toBe(user.name);
        });
    });

    describe("emitFilterEvent", () => {
        it("emit addSpaceFilter event when you create spaceFilter", async () => {
            const mockRoomConnection = {
                emitAddSpaceFilter: vi.fn(),
                emitRemoveSpaceFilter: vi.fn(),
                emitJoinSpace: vi.fn(),
            } as unknown as RoomConnection;

            const space = await Space.create(
                "space-name",
                FilterType.ALL_USERS,
                mockRoomConnection as unknown as RoomConnection,
                [],
                new Map<string, unknown>()
            );

            const unsubscribe = space.usersStore.subscribe(() => {});

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockRoomConnection.emitAddSpaceFilter).toHaveBeenCalledOnce();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockRoomConnection.emitAddSpaceFilter).toHaveBeenCalledWith({
                spaceFilterMessage: {
                    spaceName: space.getName(),
                },
            });

            unsubscribe();
        });

        it("emit removeSpaceFilter event when you stop listening to a spaceFilter", async () => {
            const mockRoomConnection = {
                emitAddSpaceFilter: vi.fn(),
                emitRemoveSpaceFilter: vi.fn(),
                emitJoinSpace: vi.fn(),
            } as unknown as RoomConnection;

            const space = await Space.create(
                "space-name",
                FilterType.ALL_USERS,
                mockRoomConnection as unknown as RoomConnection,
                [],
                new Map<string, unknown>()
            );

            const unsubscribe = space.usersStore.subscribe(() => {});
            unsubscribe();

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockRoomConnection.emitRemoveSpaceFilter).toHaveBeenCalledOnce();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockRoomConnection.emitRemoveSpaceFilter).toHaveBeenLastCalledWith({
                spaceFilterMessage: {
                    spaceName: space.getName(),
                },
            });
        });
    });
});
