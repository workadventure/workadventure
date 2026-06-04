import { get, writable } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import { FilterType } from "@workadventure/messages";
import {
    DEFAULT_PROXIMITY_SPACE_NAME,
    ProximityChatRoomManager,
    type ProximityChatRoomKind,
} from "../../../../src/front/Chat/Connection/Proximity/ProximityChatRoomManager";
import type { ProximityChatRoom } from "../../../../src/front/Chat/Connection/Proximity/ProximityChatRoom";
import type { SpaceInterface } from "../../../../src/front/Space/SpaceInterface";

function createFakeSpace(spaceName: string): SpaceInterface {
    return {
        getName: () => spaceName,
    } as SpaceInterface;
}

type FakeProximityChatRoom = Pick<
    ProximityChatRoom,
    | "id"
    | "spaceName"
    | "name"
    | "kind"
    | "isJoined"
    | "hasUserMessages"
    | "unreadMessagesCount"
    | "unreadNotificationCount"
> & {
    joinSpace: ReturnType<typeof vi.fn>;
    leaveSpace: ReturnType<typeof vi.fn>;
    setDisplayName: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
};

function createFakeRoom(spaceName: string, displayName: string, kind: ProximityChatRoomKind): FakeProximityChatRoom {
    const name = writable(displayName);

    return {
        id: `proximity:${spaceName}`,
        spaceName,
        name,
        kind: writable(kind),
        isJoined: writable(false),
        hasUserMessages: writable(false),
        unreadMessagesCount: writable(0),
        unreadNotificationCount: writable(0),
        joinSpace: vi.fn((spaceName: string) => {
            return Promise.resolve(createFakeSpace(spaceName));
        }),
        leaveSpace: vi.fn(() => {
            return Promise.resolve(true);
        }),
        setDisplayName: vi.fn((name: string) => {
            roomByName.get(spaceName)?.name.set(name);
        }),
        destroy: vi.fn(),
    };
}

const roomByName = new Map<string, FakeProximityChatRoom>();

function createManager(): ProximityChatRoomManager {
    roomByName.clear();
    return new ProximityChatRoomManager((spaceName, displayName, kind) => {
        const room = createFakeRoom(spaceName, displayName, kind);
        roomByName.set(spaceName, room);
        return room as ProximityChatRoom;
    });
}

describe("ProximityChatRoomManager", () => {
    it("joins multiple spaces without leaving existing rooms", async () => {
        const manager = createManager();

        await manager.joinSpace("space-a", "Space A", [], false, FilterType.ALL_USERS, false);
        await manager.joinSpace("space-b", "Space B", [], false, FilterType.ALL_USERS, false);

        expect(get(manager.roomsStore).map((room) => room.spaceName)).toEqual(["space-a", "space-b"]);
        expect(roomByName.get("space-a")?.leaveSpace.mock.calls).toHaveLength(0);
        expect(roomByName.get("space-b")?.leaveSpace.mock.calls).toHaveLength(0);
    });

    it("reuses a room instance when rejoining the same space", async () => {
        const manager = createManager();

        const firstRoom = await manager.joinSpace("space-a", "Space A", [], false, FilterType.ALL_USERS, false);
        firstRoom.hasUserMessages.set(true);
        await manager.leaveSpace("space-a", false);
        const secondRoom = await manager.joinSpace(
            "space-a",
            "Space A renamed",
            [],
            false,
            FilterType.ALL_USERS,
            false
        );

        expect(secondRoom).toBe(firstRoom);
        expect(roomByName.get("space-a")!.joinSpace.mock.calls).toHaveLength(2);
    });

    it("drops empty rooms after leave and keeps rooms with user messages", async () => {
        const manager = createManager();

        await manager.joinSpace("empty-space", "Empty", [], false, FilterType.ALL_USERS, false);
        await manager.leaveSpace("empty-space", false);
        expect(get(manager.roomsStore)).toEqual([]);

        const roomWithMessages = await manager.joinSpace(
            "message-space",
            "Messages",
            [],
            false,
            FilterType.ALL_USERS,
            false
        );
        roomWithMessages.hasUserMessages.set(true);
        await manager.leaveSpace("message-space", false);

        expect(get(manager.roomsStore).map((room) => room.spaceName)).toEqual(["message-space"]);
    });

    it("keeps the default proximity room visible and first", async () => {
        const manager = createManager();

        const defaultRoom = await manager.joinSpace(
            DEFAULT_PROXIMITY_SPACE_NAME,
            "Proximity Chat",
            [],
            false,
            FilterType.ALL_USERS,
            false,
            undefined,
            "default"
        );
        await manager.joinSpace("listener-space", "Listener", [], false, FilterType.ALL_USERS, false);
        await manager.leaveSpace(DEFAULT_PROXIMITY_SPACE_NAME, false);

        expect(get(manager.roomsStore).map((room) => room.spaceName)).toEqual([
            DEFAULT_PROXIMITY_SPACE_NAME,
            "listener-space",
        ]);
        expect(get(manager.roomsStore)[0]).toBe(defaultRoom);
        expect(get(defaultRoom.kind)).toBe("default");
        expect(roomByName.get(DEFAULT_PROXIMITY_SPACE_NAME)!.destroy.mock.calls).toHaveLength(0);
        expect(manager.getDefaultRoom()).toBe(defaultRoom);
    });

    it("routes all bubble spaces to the default proximity room row", async () => {
        const manager = createManager();

        const room = await manager.joinDefaultSpace("bubble-space-a", []);
        await manager.leaveDefaultSpace("bubble-space-a");
        const reusedRoom = await manager.joinDefaultSpace("bubble-space-b", []);
        const defaultRoom = roomByName.get(DEFAULT_PROXIMITY_SPACE_NAME)!;

        expect(reusedRoom).toBe(room);
        expect(get(manager.roomsStore).map((room) => room.spaceName)).toEqual([DEFAULT_PROXIMITY_SPACE_NAME]);
        expect(defaultRoom.joinSpace.mock.calls[0]).toEqual([
            "bubble-space-a",
            [],
            false,
            FilterType.ALL_USERS,
            false,
            undefined,
        ]);
        expect(defaultRoom.joinSpace.mock.calls[1]).toEqual([
            "bubble-space-b",
            [],
            false,
            FilterType.ALL_USERS,
            false,
            undefined,
        ]);
    });

    it("keeps the default room joined when a stale bubble space leave is ignored", async () => {
        const manager = createManager();

        const room = await manager.joinDefaultSpace("bubble-space-a", []);
        await manager.joinDefaultSpace("bubble-space-b", []);
        vi.mocked(roomByName.get(DEFAULT_PROXIMITY_SPACE_NAME)!.leaveSpace).mockResolvedValueOnce(false);

        await manager.leaveDefaultSpace("bubble-space-a");

        expect(get(room.isJoined)).toBe(true);
        expect(get(manager.activeRoomStore)).toBe(room);
        expect(manager.resolveTargetRoom()).toBe(room);
    });

    it("resolves legacy targets from selected joined room then most recent joined room", async () => {
        const manager = createManager();

        const olderRoom = await manager.joinSpace("older", "Older", [], false, FilterType.ALL_USERS, false);
        const newerRoom = await manager.joinSpace("newer", "Newer", [], false, FilterType.ALL_USERS, false);

        expect(manager.resolveTargetRoom()).toBe(newerRoom);

        manager.selectRoom(olderRoom);
        expect(manager.resolveTargetRoom()).toBe(olderRoom);
    });
});
