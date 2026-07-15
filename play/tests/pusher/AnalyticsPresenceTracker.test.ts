import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

import type { SocketData } from "../../src/pusher/models/Websocket/SocketData";
import { AnalyticsPresenceTracker } from "../../src/pusher/services/AnalyticsPresenceTracker";

describe("AnalyticsPresenceTracker", () => {
    it("tracks connected and disconnected events with socket duration", () => {
        const queue = {
            enqueueEvent: vi.fn(),
        };
        let now = Date.parse("2026-04-24T12:00:00.000Z");
        const tracker = new AnalyticsPresenceTracker(queue, () => now);
        const socketData = socketDataFixture();

        tracker.trackConnected(socketData);
        now = Date.parse("2026-04-24T12:02:30.000Z");
        tracker.trackDisconnected(socketData, "client_closed");

        expect(queue.enqueueEvent).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                eventName: "user.connected",
                source: "pusher",
                clientEventTimeMs: Date.parse("2026-04-24T12:00:00.000Z"),
                properties: expect.objectContaining({
                    connectionId: "tab-id",
                    connectedAt: "2026-04-24T12:00:00.000Z",
                }),
            }),
            socketData,
        );
        expect(queue.enqueueEvent).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                eventName: "user.disconnected",
                source: "pusher",
                clientEventTimeMs: Date.parse("2026-04-24T12:02:30.000Z"),
                properties: expect.objectContaining({
                    connectionId: "tab-id",
                    connectedAt: "2026-04-24T12:00:00.000Z",
                    disconnectedAt: "2026-04-24T12:02:30.000Z",
                    disconnectReason: "client_closed",
                    durationSeconds: 150,
                }),
            }),
            socketData,
        );
    });

    it("does not track disconnected events without a previous connected event", () => {
        const queue = {
            enqueueEvent: vi.fn(),
        };
        const tracker = new AnalyticsPresenceTracker(queue);

        tracker.trackDisconnected(socketDataFixture(), "client_closed");

        expect(queue.enqueueEvent).not.toHaveBeenCalled();
    });

    it("does not track duplicate connected events for the same connection", () => {
        const queue = {
            enqueueEvent: vi.fn(),
        };
        let now = Date.parse("2026-04-24T12:00:00.000Z");
        const tracker = new AnalyticsPresenceTracker(queue, () => now);
        const socketData = socketDataFixture();

        tracker.trackConnected(socketData);
        now = Date.parse("2026-04-24T12:00:05.000Z");
        tracker.trackConnected(socketData);
        now = Date.parse("2026-04-24T12:02:30.000Z");
        tracker.trackDisconnected(socketData, "client_closed");

        expect(queue.enqueueEvent).toHaveBeenCalledTimes(2);
        expect(queue.enqueueEvent).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                eventName: "user.connected",
                clientEventTimeMs: Date.parse("2026-04-24T12:00:00.000Z"),
            }),
            socketData,
        );
        expect(queue.enqueueEvent).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                eventName: "user.disconnected",
                properties: expect.objectContaining({
                    durationSeconds: 150,
                }),
            }),
            socketData,
        );
    });

    it("closes every open connection on shutdown so their sessions are not lost", () => {
        const queue = { enqueueEvent: vi.fn() };
        let now = Date.parse("2026-04-24T12:00:00.000Z");
        const tracker = new AnalyticsPresenceTracker(queue, () => now);
        const first = socketDataFixture();
        const second = socketDataFixture({ tabId: "tab-2", userUuid: "other-uuid" });

        tracker.trackConnected(first);
        tracker.trackConnected(second);
        queue.enqueueEvent.mockClear();

        now = Date.parse("2026-04-24T12:01:00.000Z");
        // Without this, SIGTERM drains whatever is queued and exits: the pairing
        // dies with the heap and neither session ever reaches the admin.
        const closed = tracker.closeAll();

        expect(closed).toBe(2);
        expect(queue.enqueueEvent).toHaveBeenCalledTimes(2);
        for (const call of queue.enqueueEvent.mock.calls) {
            expect(call[0]).toMatchObject({
                eventName: "user.disconnected",
                source: "pusher",
                properties: expect.objectContaining({
                    disconnectReason: "pusher_shutdown",
                    durationSeconds: 60,
                }),
            });
        }
        // Each event must carry its own socket's context, not the last one seen.
        expect(queue.enqueueEvent.mock.calls.map((call) => call[1])).toEqual([first, second]);
    });

    it("does not emit a session twice when a socket closes and shutdown follows", () => {
        const queue = { enqueueEvent: vi.fn() };
        let now = Date.parse("2026-04-24T12:00:00.000Z");
        const tracker = new AnalyticsPresenceTracker(queue, () => now);
        const socketData = socketDataFixture();

        tracker.trackConnected(socketData);
        now = Date.parse("2026-04-24T12:00:30.000Z");
        tracker.trackDisconnected(socketData, "client_closed");
        queue.enqueueEvent.mockClear();

        expect(tracker.closeAll()).toBe(0);
        expect(queue.enqueueEvent).not.toHaveBeenCalled();
    });
});

function socketDataFixture(overrides: Partial<SocketData> = {}): SocketData {
    return {
        userUuid: "reporter-uuid",
        userId: 123,
        spaceUserId: "reporter-space-user",
        ipAddress: "203.0.113.10",
        roomId: "https://play.test/@/team/world/room",
        world: "world",
        spaces: new Set(["world.space"]),
        tabId: "tab-id",
        analyticsEventsEnabled: true,
        ...overrides,
    } as SocketData;
}
