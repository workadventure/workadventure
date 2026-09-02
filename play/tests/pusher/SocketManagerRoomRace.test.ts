import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));
vi.mock("@sentry/node", () => ({
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    setTag: vi.fn(),
    withIsolationScope: vi.fn((callback: () => unknown) => callback()),
}));

const roomMock = vi.hoisted(() => {
    const created: FakePusherRoom[] = [];

    class FakePusherRoom {
        public readonly backConnectionClosedAbortController = new AbortController();
        public readonly init = vi.fn().mockResolvedValue(undefined);
        public readonly join = vi.fn();
        public readonly leave = vi.fn();
        public readonly setViewport = vi.fn();
        public readonly close = vi.fn();
        public isEmptyResult = false;

        public constructor(public readonly roomUrl: string) {
            created.push(this);
        }

        public isEmpty(): boolean {
            return this.isEmptyResult;
        }

        public get backConnectionClosedSignal(): AbortSignal {
            return this.backConnectionClosedAbortController.signal;
        }
    }

    return { created, FakePusherRoom };
});

vi.mock("../../src/pusher/models/PusherRoom", () => ({
    PusherRoom: roomMock.FakePusherRoom,
}));

import * as Sentry from "@sentry/node";

import { SocketManager } from "../../src/pusher/services/SocketManager";
import type { PusherWebSocket } from "../../src/pusher/services/PusherWebSocket";

type FakePusherRoom = InstanceType<typeof roomMock.FakePusherRoom>;

const ROOM_URL = "/_/global/map.example.com/map.tmj";

const createClient = (
    overrides: Partial<ReturnType<PusherWebSocket["getUserData"]>> = {},
    isDisconnecting = false,
): PusherWebSocket => {
    const socketData = {
        roomId: ROOM_URL,
        userUuid: "user-uuid",
        viewport: { left: 0, top: 0, right: 10, bottom: 10 },
        backConnection: {},
        pusherRoom: undefined,
        ...overrides,
    };

    return mock<PusherWebSocket>({
        getUserData: vi.fn().mockReturnValue(socketData),
        isDisconnecting: vi.fn().mockReturnValue(isDisconnecting),
    });
};

const getRooms = (manager: SocketManager): Map<string, FakePusherRoom> =>
    manager.getRooms() as unknown as Map<string, FakePusherRoom>;

describe("SocketManager reconnection race guards", () => {
    beforeEach(() => {
        roomMock.created.length = 0;
        vi.mocked(Sentry.captureMessage).mockReset();
        vi.mocked(Sentry.captureException).mockReset();
        vi.spyOn(console, "warn").mockImplementation(() => undefined);
        vi.spyOn(console, "error").mockImplementation(() => undefined);
    });

    // Guard (b)
    it("coalesces concurrent creations of the same room into a single instance", async () => {
        const manager = new SocketManager();

        const [first, second] = await Promise.all([
            manager.getOrCreateRoom(ROOM_URL),
            manager.getOrCreateRoom(ROOM_URL),
        ]);

        expect(first).toBe(second);
        expect(roomMock.created).toHaveLength(1);
        expect(getRooms(manager).get(ROOM_URL)).toBe(first);
    });

    // Guard (a), on the abort listener registered by getOrCreateRoom.
    it("does not evict a newer room instance when a stale one loses its back connection", async () => {
        const manager = new SocketManager();

        const stale = (await manager.getOrCreateRoom(ROOM_URL)) as unknown as FakePusherRoom;

        // A reconnection races in and registers a fresh instance for the same URL.
        const live = new roomMock.FakePusherRoom(ROOM_URL);
        getRooms(manager).set(ROOM_URL, live);

        stale.backConnectionClosedAbortController.abort();

        expect(getRooms(manager).get(ROOM_URL)).toBe(live);
    });

    // Point 4: the socket may be torn down while getOrCreateRoom is still awaiting init().
    it("releases a room created for a socket that was cleaned up during init", async () => {
        const manager = new SocketManager();
        const client = createClient({}, true);

        const room = (await manager.getOrCreateRoom(ROOM_URL)) as unknown as FakePusherRoom;
        room.isEmptyResult = true;

        // @ts-expect-error -- exercising the private guard used by both join paths.
        manager.joinRoomIfStillConnected(client, room);

        expect(room.join).not.toHaveBeenCalled();
        // The empty-room check is deferred so coalesced concurrent joiners run first.
        expect(room.close).not.toHaveBeenCalled();
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(room.close).toHaveBeenCalledTimes(1);
        expect(getRooms(manager).has(ROOM_URL)).toBe(false);
    });

    it("does not publish a room whose back connection dropped during init", async () => {
        const manager = new SocketManager();

        const promise = manager.getOrCreateRoom(ROOM_URL);
        roomMock.created[0].backConnectionClosedAbortController.abort();

        await expect(promise).rejects.toThrow(/lost while room/);
        expect(roomMock.created[0].close).toHaveBeenCalledTimes(1);
        expect(getRooms(manager).has(ROOM_URL)).toBe(false);
    });

    it("joins normally when the socket is still connected", async () => {
        const manager = new SocketManager();
        const client = createClient();

        const room = (await manager.getOrCreateRoom(ROOM_URL)) as unknown as FakePusherRoom;

        // @ts-expect-error -- exercising the private guard used by both join paths.
        manager.joinRoomIfStillConnected(client, room);

        expect(room.join).toHaveBeenCalledWith(client);
        expect(room.close).not.toHaveBeenCalled();
    });

    // Guard (c) + point 3
    it("recreates a missing room for a live socket and reports it once", async () => {
        const manager = new SocketManager();
        const client = createClient();
        const captureMessage = vi.mocked(Sentry.captureMessage);

        // A client streams viewports; the room is missing for all of them until recovery completes.
        manager.handleViewport(client, { left: 0, top: 0, right: 10, bottom: 10 });
        manager.handleViewport(client, { left: 1, top: 1, right: 11, bottom: 11 });
        manager.handleViewport(client, { left: 2, top: 2, right: 12, bottom: 12 });
        await vi.waitFor(() => expect(getRooms(manager).has(ROOM_URL)).toBe(true));

        const room = getRooms(manager).get(ROOM_URL);
        expect(roomMock.created).toHaveLength(1);
        expect(room?.join).toHaveBeenCalledWith(client);
        // One recovery, one report — not one per viewport frame.
        expect(captureMessage).toHaveBeenCalledTimes(1);
        expect(captureMessage).toHaveBeenCalledWith(expect.stringContaining("Recreated missing room"), "warning");
        expect(client.getUserData().pusherRoom).toBe(room);
    });

    it("recovers when the socket's room instance was replaced in the map", async () => {
        const manager = new SocketManager();
        const client = createClient();

        // The socket joined a stale instance; the map now holds a fresh one for the same URL.
        const stale = new roomMock.FakePusherRoom(ROOM_URL);
        const live = new roomMock.FakePusherRoom(ROOM_URL);
        client.getUserData().pusherRoom = stale as unknown as ReturnType<PusherWebSocket["getUserData"]>["pusherRoom"];
        getRooms(manager).set(ROOM_URL, live);

        manager.handleViewport(client, { left: 0, top: 0, right: 10, bottom: 10 });
        await vi.waitFor(() => expect(live.join).toHaveBeenCalledWith(client));

        expect(client.getUserData().pusherRoom).toBe(live);
        expect(stale.join).not.toHaveBeenCalled();
    });

    it("still reports an unrecoverable missing room when the socket has no back connection", () => {
        const manager = new SocketManager();
        const client = createClient({ backConnection: undefined });
        const captureException = vi.mocked(Sentry.captureException);

        manager.handleViewport(client, { left: 0, top: 0, right: 10, bottom: 10 });

        expect(roomMock.created).toHaveLength(0);
        expect(captureException).toHaveBeenCalledWith(expect.stringContaining("could not find world"));
    });
});
