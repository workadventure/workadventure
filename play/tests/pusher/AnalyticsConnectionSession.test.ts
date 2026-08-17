import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

import type { SocketData } from "../../src/pusher/models/Websocket/SocketData";
import {
    AnalyticsTimedEventTracker,
    CONNECTION_SESSION_HANDLE,
} from "../../src/pusher/services/AnalyticsTimedEventTracker";

/**
 * A connection session is an interval like any other, so it lives in the same
 * tracker. What used to be AnalyticsPresenceTracker's own test suite is here, run
 * against that tracker: the behaviour is the contract with the admin, and it did
 * not change when the implementation merged.
 *
 * The three things a session declares differently from a conversation — its own
 * field names, a row at each end, no minimum duration — are what these assertions
 * pin down.
 */
describe("connection sessions, as timed events", () => {
    function openSession(tracker: AnalyticsTimedEventTracker, socketData: SocketData): boolean {
        return tracker.open(
            CONNECTION_SESSION_HANDLE,
            "user.disconnected",
            { connectionId: socketData.tabId },
            socketData,
        );
    }

    it("emits a row at each end, with the session's own field names", () => {
        const queue = { enqueueEvent: vi.fn() };
        let now = Date.parse("2026-04-24T12:00:00.000Z");
        const tracker = new AnalyticsTimedEventTracker(queue, () => now);
        const socketData = socketDataFixture();

        openSession(tracker, socketData);
        now = Date.parse("2026-04-24T12:02:30.000Z");
        tracker.close(CONNECTION_SESSION_HANDLE, socketData, "socket_closed");

        // connectedAt / disconnectedAt, NOT startedAt / endedAt: the admin reads
        // these verbatim off the event to build analytics_connection_sessions and
        // skips the row when they are missing.
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
                    disconnectReason: "socket_closed",
                    durationSeconds: 150,
                }),
            }),
            socketData,
        );
    });

    it("keeps a sub-second session, unlike every other interval", () => {
        // The generic threshold drops sub-second intervals as transition churn. A
        // sub-second session is a tab that died on load — a real connection, and
        // dropping it undercounts connections rather than removing noise.
        const queue = { enqueueEvent: vi.fn() };
        let now = Date.parse("2026-04-24T12:00:00.000Z");
        const tracker = new AnalyticsTimedEventTracker(queue, () => now);
        const socketData = socketDataFixture();

        openSession(tracker, socketData);
        now += 40;
        tracker.close(CONNECTION_SESSION_HANDLE, socketData, "socket_closed");

        expect(queue.enqueueEvent).toHaveBeenCalledTimes(2);
        expect(queue.enqueueEvent.mock.calls[1][0].properties.durationSeconds).toBe(0);
    });

    it("drops a disconnect whose connect was never seen", () => {
        const queue = { enqueueEvent: vi.fn() };
        const tracker = new AnalyticsTimedEventTracker(queue);

        tracker.close(CONNECTION_SESSION_HANDLE, socketDataFixture(), "socket_closed");

        expect(queue.enqueueEvent).not.toHaveBeenCalled();
    });

    it("ignores a duplicate open so the session keeps its real start", () => {
        const queue = { enqueueEvent: vi.fn() };
        let now = Date.parse("2026-04-24T12:00:00.000Z");
        const tracker = new AnalyticsTimedEventTracker(queue, () => now);
        const socketData = socketDataFixture();

        openSession(tracker, socketData);
        now = Date.parse("2026-04-24T12:00:05.000Z");
        // The fixed handle is what makes this idempotent — SocketManager no longer
        // needs a flag to avoid double-opening on a second roomJoinedMessage.
        expect(openSession(tracker, socketData)).toBe(false);
        now = Date.parse("2026-04-24T12:02:30.000Z");
        tracker.close(CONNECTION_SESSION_HANDLE, socketData, "socket_closed");

        expect(queue.enqueueEvent).toHaveBeenCalledTimes(2);
        expect(queue.enqueueEvent.mock.calls[1][0].properties.durationSeconds).toBe(150);
    });

    it("closes every open session on shutdown so none is lost", () => {
        const queue = { enqueueEvent: vi.fn() };
        let now = Date.parse("2026-04-24T12:00:00.000Z");
        const tracker = new AnalyticsTimedEventTracker(queue, () => now);
        const first = socketDataFixture();
        const second = socketDataFixture({ tabId: "tab-2", userUuid: "other-uuid" });

        openSession(tracker, first);
        openSession(tracker, second);
        queue.enqueueEvent.mockClear();

        now = Date.parse("2026-04-24T12:01:00.000Z");
        // Without this, SIGTERM drains whatever is queued and exits: the pairing dies
        // with the heap and neither session ever reaches the admin.
        expect(tracker.closeAll()).toBe(2);

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
        // Each event carries its own socket's context, not the last one seen.
        expect(queue.enqueueEvent.mock.calls.map((call) => call[1])).toEqual([first, second]);
    });

    it("does not emit a session twice when a socket closes and shutdown follows", () => {
        const queue = { enqueueEvent: vi.fn() };
        let now = Date.parse("2026-04-24T12:00:00.000Z");
        const tracker = new AnalyticsTimedEventTracker(queue, () => now);
        const socketData = socketDataFixture();

        openSession(tracker, socketData);
        now = Date.parse("2026-04-24T12:00:30.000Z");
        tracker.close(CONNECTION_SESSION_HANDLE, socketData, "socket_closed");
        queue.enqueueEvent.mockClear();

        expect(tracker.closeAll()).toBe(0);
        expect(queue.enqueueEvent).not.toHaveBeenCalled();
    });

    it("emits the session AFTER the intervals it contains", () => {
        // THE ordering that defuses the admin's session join: it attributes an
        // interval to the session containing it and drops one ending even a
        // millisecond later. Both timestamps come from the same clock as this loop
        // runs, so emission order IS timestamp order. Two trackers used to guarantee
        // it by being called in a fixed order; one tracker has to sort.
        const queue = { enqueueEvent: vi.fn() };
        let now = Date.parse("2026-04-24T12:00:00.000Z");
        const tracker = new AnalyticsTimedEventTracker(queue, () => now);
        const socketData = socketDataFixture();

        // Session opened FIRST, so map insertion order alone would emit it first.
        openSession(tracker, socketData);
        tracker.open("area-1", "area.dwell", { areaId: "a", areaName: "Lobby" }, socketData);
        queue.enqueueEvent.mockClear();

        now = Date.parse("2026-04-24T12:05:00.000Z");
        tracker.closeConnection(socketData, "socket_closed");

        expect(queue.enqueueEvent.mock.calls.map((call) => call[0].eventName)).toEqual([
            "area.dwell",
            "user.disconnected",
        ]);
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
