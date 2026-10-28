import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { get, writable } from "svelte/store";
import { Deferred } from "@workadventure/shared-utils";
import { MatrixRoomFolder } from "../MatrixRoomFolder";
import { MatrixChatRoom } from "../MatrixChatRoom";
import { matrixRateLimiter } from "../../../Services/MatrixRateLimiter";

vi.mock("../../../../Phaser/Game/GameManager", () => {
    return {
        gameManager: {
            getCurrentGameScene: () => ({}),
        },
    };
});

// Importing the real MatrixChatRoom drags GameScene in, whose module graph cannot initialize in a unit test.
vi.mock("../../../../Phaser/Game/GameScene", () => {
    return {
        GameScene: class {},
    };
});

vi.mock("../../../../Phaser/Entity/CharacterLayerManager", () => {
    return {
        CharacterLayerManager: {
            wokaBase64(): Promise<string> {
                return Promise.resolve("");
            },
        },
    };
});

vi.mock(
    "../../../../Enum/EnvironmentVariable.ts",
    () => import("../../../../../../tests/front/mocks/frontEnvironmentVariableMock"),
);

vi.mock("../../../Stores/ChatStore.ts", () => {
    return {
        selectedRoomStore: writable(undefined),
        ignoredSuggestedRoomIdsStore: writable(new Set()),
    };
});

// Building a full MatrixRoomFolder needs a heavy Room mock: create a bare instance with only the state these
// methods touch.
const createFolderStub = (joined: boolean) => {
    const folder = Object.create(MatrixRoomFolder.prototype) as MatrixRoomFolder;
    const joinRoomDeferred = new Deferred<void>();
    if (joined) {
        joinRoomDeferred.resolve();
    }
    Object.assign(folder, {
        joinRoomDeferred,
        suggestedRoomsPreloadScheduled: false,
        folderList: new Map(),
        roomList: new Map(),
    });
    const ensureJoinableRoomsLoaded = vi.fn().mockResolvedValue(undefined);
    folder.ensureJoinableRoomsLoaded = ensureJoinableRoomsLoaded;
    return { folder, joinRoomDeferred, ensureJoinableRoomsLoaded };
};

describe("MatrixRoomFolder", () => {
    describe("preloadSuggestedRooms", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
            vi.restoreAllMocks();
        });

        it("should load the suggested rooms of a joined folder once, after a delay", async () => {
            const { folder, ensureJoinableRoomsLoaded } = createFolderStub(true);

            folder.preloadSuggestedRooms();
            folder.preloadSuggestedRooms();
            await vi.advanceTimersByTimeAsync(2999);
            expect(ensureJoinableRoomsLoaded).not.toHaveBeenCalled();

            await vi.advanceTimersByTimeAsync(1);
            expect(ensureJoinableRoomsLoaded).toHaveBeenCalledOnce();
        });

        it("should wait until the folder is joined", async () => {
            const { folder, joinRoomDeferred, ensureJoinableRoomsLoaded } = createFolderStub(false);

            folder.preloadSuggestedRooms();
            await vi.advanceTimersByTimeAsync(10000);
            expect(ensureJoinableRoomsLoaded).not.toHaveBeenCalled();

            joinRoomDeferred.resolve();
            await vi.advanceTimersByTimeAsync(3000);
            expect(ensureJoinableRoomsLoaded).toHaveBeenCalledOnce();
        });

        it("should not load anything once the folder is destroyed", async () => {
            vi.spyOn(MatrixChatRoom.prototype, "destroy").mockImplementation(() => {});
            const { folder, ensureJoinableRoomsLoaded } = createFolderStub(true);

            folder.preloadSuggestedRooms();
            await vi.advanceTimersByTimeAsync(1000);
            folder.destroy();
            await vi.advanceTimersByTimeAsync(5000);

            expect(ensureJoinableRoomsLoaded).not.toHaveBeenCalled();
        });
    });

    describe("refreshRooms", () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("should not suggest a room already joined, even when the folder has not loaded its children", async () => {
            const localRoom = (roomId: string, membership: string) => ({
                roomId,
                getMyMembership: () => membership,
                getAvatarUrl: () => "",
                client: { baseUrl: "https://matrix.example.com" },
            });
            const folder = Object.create(MatrixRoomFolder.prototype) as MatrixRoomFolder;
            Object.assign(folder, {
                id: "!space:example.com",
                room: {
                    client: {
                        getRooms: () => [
                            localRoom("!joined:example.com", "join"),
                            localRoom("!left:example.com", "leave"),
                        ],
                    },
                },
                allSuggestedRooms: writable([]),
                availableRooms: writable([]),
            });
            vi.spyOn(matrixRateLimiter, "getRoomHierarchy").mockResolvedValue({
                rooms: [
                    { room_id: "!joined:example.com", name: "Joined" },
                    { room_id: "!left:example.com", name: "Left" },
                    { room_id: "!unknown:example.com", name: "Unknown" },
                ],
            } as never);

            await folder.refreshRooms();

            expect(get(folder.allSuggestedRooms).map((room) => room.id)).toEqual([
                "!left:example.com",
                "!unknown:example.com",
            ]);
        });
    });
});
