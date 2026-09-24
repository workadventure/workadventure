import * as Phaser from "phaser";
globalThis.Phaser = Phaser;

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Subject } from "rxjs";
import { writable } from "svelte/store";
import { FilterType, SpaceUser } from "@workadventure/messages";
import { SpaceRegistry } from "../SpaceRegistry/SpaceRegistry";
import type { Space } from "../Space";
import { MockRoomConnectionForSpaces } from "./MockRoomConnectionForSpaces";

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
                getRemotePlayersRepository: () => ({
                    getPlayer: vi.fn(),
                }),
                roomUrl: "test-room",
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

vi.mock(
    "../../Enum/EnvironmentVariable.ts",
    () => import("../../../../tests/front/mocks/frontEnvironmentVariableMock"),
);

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

vi.mock("../../Connection/ConnectionManager", () => {
    return {
        connectionManager: {
            roomConnectionStream: new Subject(),
        },
    };
});

// A play or back restart drops the connection to the server and the GameScene is rebuilt. These tests pin how the
// registry carries the spaces, and the conversations going on in them, from one scene to the next.
describe("SpaceRegistry across a reconnection to the server", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    async function registryWithSpace() {
        const oldConnection = new MockRoomConnectionForSpaces();
        oldConnection.emitJoinSpace.mockResolvedValue("room_me");
        const registry = new SpaceRegistry(oldConnection, new Subject());
        const space = (await registry.joinSpace(
            "meeting",
            FilterType.ALL_USERS,
            [],
            new AbortController().signal,
        )) as Space;
        return { registry, space, oldConnection };
    }

    it("keeps a space the tearing-down scene leaves while suspended", async () => {
        const { registry, space } = await registryWithSpace();
        const destroy = vi.spyOn(space, "destroy");

        registry.suspend();
        await registry.leaveSpace(space);

        expect(destroy).not.toHaveBeenCalled();
        expect(registry.exist("meeting")).toBe(true);
    });

    it("hands the kept space to the next scene, joined again through the new connection", async () => {
        const { registry, space, oldConnection } = await registryWithSpace();
        registry.suspend();
        await registry.leaveSpace(space);

        const newConnection = new MockRoomConnectionForSpaces();
        newConnection.emitJoinSpace.mockResolvedValue("room_me");
        registry.resume(newConnection);
        const adopted = await registry.joinSpace("meeting", FilterType.ALL_USERS, [], new AbortController().signal);

        expect(adopted).toBe(space);
        expect(newConnection.emitJoinSpace).toHaveBeenCalledTimes(1);
        expect(oldConnection.emitJoinSpace).toHaveBeenCalledTimes(1);
    });

    it("listens to the new connection only", async () => {
        const { registry, space, oldConnection } = await registryWithSpace();
        const removeUser = vi.spyOn(space, "removeUser");
        registry.suspend();
        const newConnection = new MockRoomConnectionForSpaces();
        newConnection.emitJoinSpace.mockResolvedValue("room_me");
        registry.resume(newConnection);

        oldConnection.removeSpaceUserMessageStream.next({ spaceName: "meeting", spaceUserId: "room_old" });
        newConnection.removeSpaceUserMessageStream.next({ spaceName: "meeting", spaceUserId: "room_new" });

        expect(removeUser.mock.calls).toEqual([["room_new"]]);
    });

    it("drops the users who left the space while the connection was down", async () => {
        const { registry, space } = await registryWithSpace();
        const bob = SpaceUser.fromPartial({ spaceUserId: "room_bob", name: "Bob" });
        const carol = SpaceUser.fromPartial({ spaceUserId: "room_carol", name: "Carol" });
        space.initUsers([bob, carol]);
        registry.suspend();
        const newConnection = new MockRoomConnectionForSpaces();
        newConnection.emitJoinSpace.mockResolvedValue("room_me");
        registry.resume(newConnection);

        newConnection.initSpaceUsersMessageStream.next({ spaceName: "meeting", users: [bob], metadata: "" });
        await vi.advanceTimersByTimeAsync(30_000);

        expect(space.getSpaceUserBySpaceUserId("room_bob")).toBeDefined();
        expect(space.getSpaceUserBySpaceUserId("room_carol")).toBeUndefined();
    });

    it("keeps a user a restarted back lists late, without removing it in between", async () => {
        const { registry, space } = await registryWithSpace();
        const bob = SpaceUser.fromPartial({ spaceUserId: "room_bob", name: "Bob" });
        space.initUsers([bob]);
        const bobBefore = space.getSpaceUserBySpaceUserId("room_bob");
        const removeUser = vi.spyOn(space, "removeUser");
        registry.suspend();
        const newConnection = new MockRoomConnectionForSpaces();
        newConnection.emitJoinSpace.mockResolvedValue("room_me");
        registry.resume(newConnection);

        // Bob is not back yet when the back first lists the space, and comes back a few seconds later
        newConnection.initSpaceUsersMessageStream.next({ spaceName: "meeting", users: [], metadata: "" });
        await vi.advanceTimersByTimeAsync(5_000);
        newConnection.addSpaceUserMessageStream.next({ spaceName: "meeting", user: bob });
        await vi.advanceTimersByTimeAsync(30_000);

        expect(removeUser).not.toHaveBeenCalled();
        expect(space.getSpaceUserBySpaceUserId("room_bob")).toBe(bobBefore);
    });

    it("leaves for good a kept space the next scene does not join again", async () => {
        const { registry, space } = await registryWithSpace();
        const destroy = vi.spyOn(space, "destroy");
        registry.suspend();
        const newConnection = new MockRoomConnectionForSpaces();
        newConnection.emitJoinSpace.mockResolvedValue("room_me");
        registry.resume(newConnection);

        await vi.advanceTimersByTimeAsync(30_000);

        expect(destroy).toHaveBeenCalledTimes(1);
        expect(registry.exist("meeting")).toBe(false);
    });

    it("hangs up the conversations when the server is not back within 2 minutes", async () => {
        const { registry, space } = await registryWithSpace();
        const destroy = vi.spyOn(space, "destroy");

        registry.setServerLost(true);
        await vi.advanceTimersByTimeAsync(119_000);
        expect(destroy).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1_000);

        expect(destroy).toHaveBeenCalledTimes(1);
        expect(registry.exist("meeting")).toBe(false);
        // The scene, torn down later, leaves the space it still knows of
        await expect(registry.leaveSpace(space)).resolves.toBeUndefined();
    });

    it("keeps the conversations when the server is back in time", async () => {
        const { registry, space } = await registryWithSpace();
        const destroy = vi.spyOn(space, "destroy");

        registry.setServerLost(true);
        await vi.advanceTimersByTimeAsync(100_000);
        registry.suspend();
        const newConnection = new MockRoomConnectionForSpaces();
        newConnection.emitJoinSpace.mockResolvedValue("room_me");
        registry.resume(newConnection);
        await registry.joinSpace("meeting", FilterType.ALL_USERS, [], new AbortController().signal);
        await vi.advanceTimersByTimeAsync(200_000);

        expect(destroy).not.toHaveBeenCalled();
    });

    it("keeps the conversations when the connection resumes on its own", async () => {
        const { registry, space } = await registryWithSpace();
        const destroy = vi.spyOn(space, "destroy");

        registry.setServerLost(true);
        await vi.advanceTimersByTimeAsync(10_000);
        registry.setServerLost(false);
        await vi.advanceTimersByTimeAsync(200_000);

        expect(destroy).not.toHaveBeenCalled();
    });
});
