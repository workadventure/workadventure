import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

import type { SocketData } from "../../src/pusher/models/Websocket/SocketData";
import type { AnalyticsEventInput } from "../../src/pusher/services/AnalyticsEventsQueue";
import {
    AnalyticsTimedEventTracker,
    MAX_OPEN_TIMED_EVENTS_PER_CONNECTION,
} from "../../src/pusher/services/AnalyticsTimedEventTracker";
import { AnalyticsPresenceTracker } from "../../src/pusher/services/AnalyticsPresenceTracker";

describe("AnalyticsTimedEventTracker", () => {
    it("reports one row per interval, timed on the pusher's clock", () => {
        const queue = { enqueueEvent: vi.fn() };
        let now = Date.parse("2026-04-24T12:00:00.000Z");
        const tracker = new AnalyticsTimedEventTracker(queue, () => now);
        const socketData = socketDataFixture();

        tracker.open("h1", "conversation.ended", { conversationId: "group:5" }, socketData);
        now = Date.parse("2026-04-24T12:02:30.000Z");
        tracker.close("h1", socketData);

        expect(queue.enqueueEvent).toHaveBeenCalledTimes(1);
        expect(queue.enqueueEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                eventName: "conversation.ended",
                // The client never reports a duration: it is measured here, on both
                // ends. With sampling, faking an hour took 60 forged events; with a
                // client-sent scalar it would take one.
                source: "pusher",
                clientEventTimeMs: Date.parse("2026-04-24T12:02:30.000Z"),
                properties: expect.objectContaining({
                    conversationId: "group:5",
                    startedAt: "2026-04-24T12:00:00.000Z",
                    endedAt: "2026-04-24T12:02:30.000Z",
                    durationSeconds: 150,
                    endReason: "closed_by_client",
                }),
            }),
            socketData,
        );
    });

    it("drops an interval shorter than a second as transition churn", () => {
        const queue = { enqueueEvent: vi.fn() };
        let now = Date.parse("2026-04-24T12:00:00.000Z");
        const tracker = new AnalyticsTimedEventTracker(queue, () => now);
        const socketData = socketDataFixture();

        tracker.open("h1", "conversation.ended", { conversationId: "group:5" }, socketData);
        // The phantom: a "remote" conversation opened for two milliseconds while a
        // meeting tore down, then closed. It carried no duration but used to count.
        now += 2;
        tracker.close("h1", socketData, "left_conversation");

        expect(queue.enqueueEvent).not.toHaveBeenCalled();
    });

    it("keeps an interval of exactly one second", () => {
        const queue = { enqueueEvent: vi.fn() };
        let now = Date.parse("2026-04-24T12:00:00.000Z");
        const tracker = new AnalyticsTimedEventTracker(queue, () => now);
        const socketData = socketDataFixture();

        tracker.open("h1", "conversation.ended", { conversationId: "group:5" }, socketData);
        now += 1000;
        tracker.close("h1", socketData);

        expect(queue.enqueueEvent).toHaveBeenCalledTimes(1);
        expect(queue.enqueueEvent.mock.calls[0][0].properties.durationSeconds).toBe(1);
    });

    it("rejects opening a name the client is not allowed to have synthesized", () => {
        const queue = { enqueueEvent: vi.fn() };
        const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const tracker = new AnalyticsTimedEventTracker(queue);
        const socketData = socketDataFixture();

        // Without this guard the open frame is a name-forging primitive: the pusher
        // would emit `user.disconnected` signed source "pusher", which the admin
        // projects straight into analytics_connection_sessions.
        expect(tracker.open("h1", "user.disconnected", {}, socketData)).toBe(false);
        tracker.close("h1", socketData);

        expect(queue.enqueueEvent).not.toHaveBeenCalled();
        consoleWarn.mockRestore();
    });

    it("drops a close with no matching open", () => {
        const queue = { enqueueEvent: vi.fn() };
        const tracker = new AnalyticsTimedEventTracker(queue);

        // No trustworthy startedAt, so no event rather than a bogus duration.
        tracker.close("never-opened", socketDataFixture());

        expect(queue.enqueueEvent).not.toHaveBeenCalled();
    });

    it("ignores a duplicate open so the interval keeps its real start", () => {
        const queue = { enqueueEvent: vi.fn() };
        let now = Date.parse("2026-04-24T12:00:00.000Z");
        const tracker = new AnalyticsTimedEventTracker(queue, () => now);
        const socketData = socketDataFixture();

        tracker.open("h1", "conversation.ended", {}, socketData);
        now = Date.parse("2026-04-24T12:01:00.000Z");
        expect(tracker.open("h1", "conversation.ended", {}, socketData)).toBe(false);
        now = Date.parse("2026-04-24T12:02:00.000Z");
        tracker.close("h1", socketData);

        // 120s from the FIRST open — a re-open would have shortened it to 60.
        expect(queue.enqueueEvent.mock.calls[0][0].properties.durationSeconds).toBe(120);
    });

    it("holds several intervals open on one socket at once", () => {
        const queue = { enqueueEvent: vi.fn() };
        const tracker = new AnalyticsTimedEventTracker(queue);
        const socketData = socketDataFixture();

        // A user can be in a conversation, inside an area and screensharing at the
        // same time — handles keep them apart, so no interval is ever swallowed.
        expect(tracker.open("h1", "conversation.ended", { conversationId: "a" }, socketData)).toBe(true);
        expect(tracker.open("h2", "conversation.ended", { conversationId: "b" }, socketData)).toBe(true);

        expect(tracker.closeConnection(socketData, "socket_closed")).toBe(2);
    });

    it("bounds how many intervals one socket may hold open", () => {
        const queue = { enqueueEvent: vi.fn() };
        const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const tracker = new AnalyticsTimedEventTracker(queue);
        const socketData = socketDataFixture();

        for (let i = 0; i < MAX_OPEN_TIMED_EVENTS_PER_CONNECTION; i++) {
            expect(tracker.open(`h${i}`, "conversation.ended", {}, socketData)).toBe(true);
        }
        // The map is heap held per connection; a client that opens and never closes
        // would otherwise grow it without limit.
        expect(tracker.open("one-too-many", "conversation.ended", {}, socketData)).toBe(false);

        consoleWarn.mockRestore();
    });

    it("closes only the socket that went away", () => {
        const queue = { enqueueEvent: vi.fn() };
        let now = Date.parse("2026-04-24T12:00:00.000Z");
        const tracker = new AnalyticsTimedEventTracker(queue, () => now);
        const leaving = socketDataFixture({ tabId: "tab-leaving" });
        const staying = socketDataFixture({ tabId: "tab-staying" });

        tracker.open("h1", "conversation.ended", {}, leaving);
        tracker.open("h2", "conversation.ended", {}, staying);
        now += 1000;

        expect(tracker.closeConnection(leaving, "socket_closed")).toBe(1);
        expect(queue.enqueueEvent).toHaveBeenCalledTimes(1);
        expect(queue.enqueueEvent.mock.calls[0][1]).toBe(leaving);
        // The other socket is untouched and still closeable.
        expect(tracker.closeAll()).toBe(1);
    });

    it("closes intervals before connection sessions, so an interval never outlives its session", () => {
        // THE ordering that defuses the admin's session join: it attributes a
        // conversation to the session containing it, and an interval ending even one
        // millisecond after its session's disconnect is dropped outright — a silent
        // zero on the headline metric. Probed against ClickHouse: 30 minutes → 0s.
        const calls: string[] = [];
        const queue = {
            enqueueEvent: vi.fn((event: AnalyticsEventInput) => {
                calls.push(event.eventName);
            }),
        };
        let now = Date.parse("2026-04-24T12:00:00.000Z");
        const timed = new AnalyticsTimedEventTracker(queue, () => now);
        const presence = new AnalyticsPresenceTracker(queue, () => now);
        const socketData = socketDataFixture();

        presence.trackConnected(socketData);
        timed.open("h1", "conversation.ended", {}, socketData);
        now = Date.parse("2026-04-24T12:05:00.000Z");

        // Same order as SocketManager.leaveRoom and server.ts.
        timed.closeAll("pusher_shutdown");
        presence.closeAll();

        expect(calls).toEqual(["user.connected", "conversation.ended", "user.disconnected"]);
        const ended = queue.enqueueEvent.mock.calls[1][0].properties;
        const disconnected = queue.enqueueEvent.mock.calls[2][0].properties;
        expect(timestampOf(ended, "endedAt")).toBeLessThanOrEqual(timestampOf(disconnected, "disconnectedAt"));
    });

    it("carries each socket's own context, not the last one seen", () => {
        const queue = { enqueueEvent: vi.fn() };
        let now = Date.parse("2026-04-24T12:00:00.000Z");
        const tracker = new AnalyticsTimedEventTracker(queue, () => now);
        const first = socketDataFixture({ tabId: "tab-1" });
        const second = socketDataFixture({ tabId: "tab-2", userUuid: "other-uuid" });

        tracker.open("h1", "conversation.ended", {}, first);
        tracker.open("h2", "conversation.ended", {}, second);
        now += 1000;
        tracker.closeAll();

        expect(queue.enqueueEvent.mock.calls.map((call) => call[1])).toEqual([first, second]);
    });
});

/**
 * Reads an ISO timestamp out of an emitted event's properties.
 *
 * They are typed JsonValue, so narrowing here rather than casting: a property that stopped being a
 * string would otherwise stringify to something Date.parse turns into NaN, and every comparison
 * against NaN is false — the test would fail, but pointing at the wrong thing.
 */
function timestampOf(properties: AnalyticsEventInput["properties"], key: string): number {
    const value = properties[key];
    if (typeof value !== "string") {
        throw new Error(`Expected ${key} to be an ISO string, got ${typeof value}`);
    }

    return Date.parse(value);
}

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
