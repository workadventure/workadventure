import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { register } from "prom-client";
import { AvailabilityStatus, PositionMessage_Direction } from "@workadventure/messages";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));
vi.mock("../../src/pusher/models/PusherRoom", () => ({
    PusherRoom: class {
        public readonly backConnectionClosedSignal = new AbortController().signal;
        public readonly init = () => Promise.resolve();
        public readonly join = vi.fn();
        public readonly leave = vi.fn();
        public readonly isEmpty = () => false;
    },
}));

import { socketManager } from "../../src/pusher/services/SocketManager";
import type { PusherWebSocket } from "../../src/pusher/services/PusherWebSocket";

const nbSockets = async () => (await register.getSingleMetric("workadventure_nb_sockets")?.get())?.values[0]?.value;

const socket = () =>
    mock<PusherWebSocket>({
        getUserData: vi.fn().mockReturnValue({
            roomId: "https://play.test/@/org/world/room",
            userUuid: "user",
            tabId: "tab",
            backConnection: { write: vi.fn(), end: vi.fn() },
        }),
    });

describe("workadventure_nb_sockets", () => {
    // The singleton, not a new SocketManager: each instance registers its own gauge listeners.
    const manager = socketManager;

    beforeEach(() => {
        register.resetMetrics();
    });

    it("is not decremented by a socket that closes before joining the room", async () => {
        manager.leaveRoom(socket());

        expect(await nbSockets()).toBe(0);
    });

    it("comes back to 0 when a joined socket is cleaned up twice", async () => {
        const client = socket();
        await manager.handleJoinRoom(client, {
            name: "user",
            availabilityStatus: AvailabilityStatus.ONLINE,
            positionMessage: { x: 0, y: 0, direction: PositionMessage_Direction.DOWN, moving: false },
            viewportMessage: { left: 0, top: 0, right: 0, bottom: 0 },
        });
        expect(await nbSockets()).toBe(1);

        // A normal close cleans up twice: on the transport close, then when the back ends the stream we ended.
        manager.leaveRoom(client);
        manager.leaveRoom(client);

        expect(await nbSockets()).toBe(0);
    });
});
