import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

const roomMock = vi.hoisted(() => {
    const created: FakePusherRoom[] = [];

    class FakePusherRoom {
        public resolveInit: () => void = () => undefined;
        public readonly init = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    this.resolveInit = resolve;
                }),
        );
        public readonly backConnectionClosedAbortController = new AbortController();

        public constructor(public readonly roomUrl: string) {
            created.push(this);
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

import { SocketManager } from "../../src/pusher/services/SocketManager";
import type { PusherRoom } from "../../src/pusher/models/PusherRoom";

type FakePusherRoom = InstanceType<typeof roomMock.FakePusherRoom>;

const ROOM_URL = "/_/global/map.example.com/map.tmj";

describe("SocketManager.getOrCreateRoom", () => {
    beforeEach(() => {
        roomMock.created.length = 0;
    });

    it("shares one room between callers that arrive while init() is still pending", async () => {
        const manager = new SocketManager();

        const first = manager.getOrCreateRoom(ROOM_URL);
        const second = manager.getOrCreateRoom(ROOM_URL);
        expect(roomMock.created).toHaveLength(1);

        roomMock.created[0].resolveInit();
        const [firstRoom, secondRoom] = await Promise.all([first, second]);

        expect(firstRoom).toBe(secondRoom);
        expect(manager.getRooms().get(ROOM_URL)).toBe(firstRoom);
        // A later call after init() resolved gets the same instance without creating a new one.
        expect(await manager.getOrCreateRoom(ROOM_URL)).toBe(firstRoom);
        expect(roomMock.created).toHaveLength(1);
    });

    it("does not let a stale instance evict the live one when its back connection closes", async () => {
        const manager = new SocketManager();

        const stalePromise = manager.getOrCreateRoom(ROOM_URL);
        roomMock.created[0].resolveInit();
        const stale = (await stalePromise) as unknown as FakePusherRoom;

        const live = new roomMock.FakePusherRoom(ROOM_URL);
        manager.getRooms().set(ROOM_URL, live as unknown as PusherRoom);

        stale.backConnectionClosedAbortController.abort();

        expect(manager.getRooms().get(ROOM_URL)).toBe(live);
    });
});
