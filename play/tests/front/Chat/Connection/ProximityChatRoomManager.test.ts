import { get, writable } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import { FilterType } from "@workadventure/messages";
import {
    DEFAULT_PROXIMITY_SPACE_NAME,
    ProximityChatRoomManager,
    type ManagedProximityChatRoom,
    type ProximityChatRoomKind,
} from "../../../../src/front/Chat/Connection/Proximity/ProximityChatRoomManager";

function createFakeRoom(spaceName: string, displayName: string, kind: ProximityChatRoomKind): ManagedProximityChatRoom {
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
        joinSpace: vi.fn(async () => {
            return undefined;
        }),
        leaveSpace: vi.fn(async () => {
            return undefined;
        }),
        setDisplayName: vi.fn((name: string) => {
            roomByName.get(spaceName)?.name.set(name);
        }),
        destroy: vi.fn(),
    };
}

const roomByName = new Map<string, ManagedProximityChatRoom>();

describe("ProximityChatRoomManager", () => {
    it("joins multiple spaces without leaving existing rooms", async () => {
        roomByName.clear();
        const manager = new ProximityChatRoomManager((spaceName, displayName, kind) => {
            const room = createFakeRoom(spaceName, displayName, kind);
            roomByName.set(spaceName, room);
            return room;
        });

        await manager.joinSpace("space-a", "Space A", [], false, FilterType.ALL_USERS, false);
        await manager.joinSpace("space-b", "Space B", [], false, FilterType.ALL_USERS, false);

        expect(get(manager.roomsStore).map((room) => room.spaceName)).toEqual(["space-a", "space-b"]);
        expect(roomByName.get("space-a")?.leaveSpace).not.toHaveBeenCalled();
        expect(roomByName.get("space-b")?.leaveSpace).not.toHaveBeenCalled();
    });

    it("reuses a room instance when rejoining the same space", async () => {
        roomByName.clear();
        const manager = new ProximityChatRoomManager((spaceName, displayName, kind) => {
            const room = createFakeRoom(spaceName, displayName, kind);
            roomByName.set(spaceName, room);
            return room;
        });

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
        expect(firstRoom.joinSpace).toHaveBeenCalledTimes(2);
    });

    it("drops empty rooms after leave and keeps rooms with user messages", async () => {
        roomByName.clear();
        const manager = new ProximityChatRoomManager((spaceName, displayName, kind) => {
            const room = createFakeRoom(spaceName, displayName, kind);
            roomByName.set(spaceName, room);
            return room;
        });

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
        roomByName.clear();
        const manager = new ProximityChatRoomManager((spaceName, displayName, kind) => {
            const room = createFakeRoom(spaceName, displayName, kind);
            roomByName.set(spaceName, room);
            return room;
        });

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
        expect(defaultRoom.destroy).not.toHaveBeenCalled();
        expect(manager.getDefaultRoom()).toBe(defaultRoom);
    });

    it("routes all bubble spaces to the default proximity room row", async () => {
        roomByName.clear();
        const manager = new ProximityChatRoomManager((spaceName, displayName, kind) => {
            const room = createFakeRoom(spaceName, displayName, kind);
            roomByName.set(spaceName, room);
            return room;
        });

        const room = await manager.joinDefaultSpace("bubble-space-a", []);
        await manager.leaveDefaultSpace("bubble-space-a");
        const reusedRoom = await manager.joinDefaultSpace("bubble-space-b", []);

        expect(reusedRoom).toBe(room);
        expect(get(manager.roomsStore).map((room) => room.spaceName)).toEqual([DEFAULT_PROXIMITY_SPACE_NAME]);
        expect(room.joinSpace).toHaveBeenNthCalledWith(
            1,
            "bubble-space-a",
            [],
            false,
            FilterType.ALL_USERS,
            false,
            undefined
        );
        expect(room.joinSpace).toHaveBeenNthCalledWith(
            2,
            "bubble-space-b",
            [],
            false,
            FilterType.ALL_USERS,
            false,
            undefined
        );
    });

    it("resolves legacy targets from selected joined room then most recent joined room", async () => {
        roomByName.clear();
        const manager = new ProximityChatRoomManager((spaceName, displayName, kind) => {
            const room = createFakeRoom(spaceName, displayName, kind);
            roomByName.set(spaceName, room);
            return room;
        });

        const olderRoom = await manager.joinSpace("older", "Older", [], false, FilterType.ALL_USERS, false);
        const newerRoom = await manager.joinSpace("newer", "Newer", [], false, FilterType.ALL_USERS, false);

        expect(manager.resolveTargetRoom()).toBe(newerRoom);

        manager.selectRoom(olderRoom);
        expect(manager.resolveTargetRoom()).toBe(olderRoom);
    });
});
