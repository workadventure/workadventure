import type { Room } from "matrix-js-sdk";
import { describe, expect, it, vi } from "vitest";
import { get, writable } from "svelte/store";
import type { matrixRateLimiter } from "../../../Services/MatrixRateLimiter";
import { MatrixRoomFolder } from "../MatrixRoomFolder";

const getRoomHierarchy = vi.hoisted(() => vi.fn<typeof matrixRateLimiter.getRoomHierarchy>());

vi.mock("../../../Services/MatrixRateLimiter", () => ({
    matrixRateLimiter: { getRoomHierarchy },
}));

vi.mock("../../../../Phaser/Game/GameManager", () => ({
    gameManager: { getCurrentGameScene: () => ({}) },
}));

// Importing the real MatrixChatRoom drags GameScene in, whose module graph cannot initialize in a unit test.
vi.mock("../../../../Phaser/Game/GameScene", () => ({ GameScene: class {} }));

vi.mock("../../../../Phaser/Entity/CharacterLayerManager", () => ({
    CharacterLayerManager: { wokaBase64: () => Promise.resolve("") },
}));

vi.mock(
    "../../../../Enum/EnvironmentVariable.ts",
    () => import("../../../../../../tests/front/mocks/frontEnvironmentVariableMock"),
);

vi.mock("../../../Stores/ChatStore.ts", () => ({
    selectedRoomStore: writable(undefined),
}));

type Hierarchy = Awaited<ReturnType<typeof matrixRateLimiter.getRoomHierarchy>>;

describe("MatrixRoomFolder.ensureJoinableRoomsLoaded", () => {
    // Building a full MatrixRoomFolder needs a heavy Room mock: create a bare instance
    // with only the state the joinable rooms loading touches.
    const createFolderStub = () => {
        const folder = Object.create(MatrixRoomFolder.prototype) as MatrixRoomFolder;
        Object.assign(folder, {
            id: "!folder:matrix.org",
            room: {
                client: { getRooms: () => [], baseUrl: "https://matrix.example.com", mxcUrlToHttp: () => null },
            } as unknown as Room,
            availableRooms: writable([]),
            allSuggestedRooms: writable([]),
            hasChildRoomsError: writable(false),
            joinableRoomsLoading: writable(false),
            joinableRoomsLoaded: false,
        });
        return folder;
    };

    it("keeps the error until a retry succeeds", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        getRoomHierarchy.mockRejectedValueOnce(new Error("Synapse is down"));
        const folder = createFolderStub();

        await expect(folder.ensureJoinableRoomsLoaded()).rejects.toThrow("Synapse is down");
        expect(get(folder.hasChildRoomsError)).toBe(true);
        expect(get(folder.joinableRoomsLoading)).toBe(false);

        // Retry: the error stays shown while the rooms load again.
        let resolveAllRooms: (hierarchy: Hierarchy) => void = () => {};
        getRoomHierarchy.mockReturnValueOnce(
            new Promise<Hierarchy>((resolve) => {
                resolveAllRooms = resolve;
            }),
        );
        getRoomHierarchy.mockResolvedValueOnce({ rooms: [] });

        const retry = folder.ensureJoinableRoomsLoaded();
        expect(get(folder.joinableRoomsLoading)).toBe(true);
        expect(get(folder.hasChildRoomsError)).toBe(true);

        resolveAllRooms({
            rooms: [{ room_id: "!club:matrix.org", name: "club-music", num_joined_members: 24 }],
        } as unknown as Hierarchy);
        await retry;

        expect(get(folder.hasChildRoomsError)).toBe(false);
        expect(get(folder.joinableRoomsLoading)).toBe(false);
        expect(get(folder.availableRooms)).toEqual([
            expect.objectContaining({ id: "!club:matrix.org", name: "club-music", memberCount: 24 }),
        ]);
    });
});
