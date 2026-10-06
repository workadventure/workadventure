import * as Phaser from "phaser";
globalThis.Phaser = Phaser;

import { describe, expect, it, vi } from "vitest";
import type { SpaceUser } from "@workadventure/messages";
import { FilterType } from "@workadventure/messages";
import { get, writable } from "svelte/store";
import type { RoomConnection } from "../../Connection/RoomConnection";
import { Space } from "../Space";
import type { SpaceUserExtended } from "../SpaceInterface";

const defaultRoomConnectionMock = {
    emitUserJoinSpace: vi.fn(),
    emitAddSpaceFilter: vi.fn(),
    emitJoinSpace: vi.fn(),
    emitRemoveSpaceFilter: vi.fn(),
} as unknown as RoomConnection;

// const defaultPeerStoreMock = {
//     getSpaceStore: vi.fn(),
//     removePeer: vi.fn(),
//     getPeer: vi.fn(),
// };

// Mock the entire GameManager module
vi.mock("../../Phaser/Game/GameManager", () => ({
    gameManager: {
        getCurrentGameScene: vi.fn(() => ({
            getRemotePlayersRepository: () => ({
                getPlayer: vi.fn(),
            }),
            roomUrl: "test-room",
        })),
    },
}));

// Mock SimplePeer
vi.mock("../../WebRtc/SimplePeer", () => ({
    SimplePeer: vi.fn().mockImplementation(() => ({
        closeAllConnections: vi.fn(),
        destroy: vi.fn(),
    })),
}));

vi.mock("../../Stores/ScreenSharingStore", () => {
    const requested = writable(false);
    return {
        requestedScreenSharingState: {
            subscribe: requested.subscribe,
            enableScreenSharing: () => requested.set(true),
            disableScreenSharing: () => requested.set(false),
        },
        screenSharingLocalStreamStore: writable({ type: "success" }),
        screenSharingConstraintsStore: writable({ video: false, audio: false }),
        screenSharingAvailableStore: writable(false),
        screenSharingLocalVideoBox: writable(undefined),
        screenShareQualityStore: {
            subscribe: writable("recommended").subscribe,
            setQuality: vi.fn(),
        },
        screenSharingLocalMedia: writable(undefined),
    };
});

vi.mock("../../Stores/MegaphoneStore", () => {
    return {
        liveStreamingEnabledStore: writable(false),
        requestedMegaphoneStore: writable(false),
        megaphoneSpaceStore: writable(undefined),
        megaphoneCanBeUsedStore: writable(false),
    };
});

vi.mock("../../Stores/MenuStore", () => {
    return {
        menuIconVisiblilityStore: writable(false),
        menuVisiblilityStore: writable(false),
        screenSharingActivatedStore: writable(false),
        inviteUserActivated: writable(false),
        mapEditorActivated: writable(false),
        roomListActivated: writable(false),
    };
});

vi.mock("../../WebRtc/MediaManager", () => {
    return {
        MediaManager: vi.fn(),
        mediaManager: {
            enableMyCamera: vi.fn(),
            disableMyCamera: vi.fn(),
            enableMyMicrophone: vi.fn(),
            disableMyMicrophone: vi.fn(),
            enableProximityMeeting: vi.fn(),
            disableProximityMeeting: vi.fn(),
        },
    };
});

vi.mock("../../Stores/MediaStore", async (importOriginal) => {
    const actual: object = await importOriginal();
    return {
        ...actual,
        isSpeakerStore: writable(false),
    };
});

vi.mock(
    "../../Enum/EnvironmentVariable.ts",
    () => import("../../../../tests/front/mocks/frontEnvironmentVariableMock"),
);

const signal = new AbortController().signal;

describe("SpaceFilter", () => {
    describe("addUser", () => {
        //not throw a error because this function is call when you receive a message by the pusher
        it("should add user when user is not exist in list  ", async () => {
            const space = await Space.create(
                "space-name",
                FilterType.ALL_USERS,
                defaultRoomConnectionMock,
                [],
                signal,
                {
                    metadata: new Map<string, unknown>(),
                },
            );
            const spaceUserId = "foo_0";
            const user: Pick<SpaceUserExtended, "spaceUserId"> = {
                spaceUserId,
            };

            space.addUser(user as SpaceUserExtended);
            expect(get(space.usersStore).has(user.spaceUserId)).toBeTruthy();
        });

        it("should not overwrite user when you add a new user and he already exists", async () => {
            const space = await Space.create(
                "space-name",
                FilterType.ALL_USERS,
                defaultRoomConnectionMock,
                [],
                signal,
                {
                    metadata: new Map<string, unknown>(),
                },
            );
            const spaceUserId = "foo_1";

            space.addUser({
                spaceUserId,
                name: "user-name",
            } as unknown as SpaceUserExtended);
            space.addUser({
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
                signal,
                {
                    metadata: new Map<string, unknown>(),
                },
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

            space.addUser(user as SpaceUserExtended);
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
                signal,
                {
                    metadata: new Map<string, unknown>(),
                },
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

            space.addUser(user as SpaceUserExtended);
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
                new AbortController().signal,
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

            space.addUser(user as SpaceUserExtended);
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

            const space = await Space.create("space-name", FilterType.ALL_USERS, mockRoomConnection, [], signal, {
                metadata: new Map<string, unknown>(),
            });

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

            const space = await Space.create("space-name", FilterType.ALL_USERS, mockRoomConnection, [], signal, {
                metadata: new Map<string, unknown>(),
            });

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
