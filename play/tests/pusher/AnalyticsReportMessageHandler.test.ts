import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The handler defaults its tracker argument to the analyticsTimedEventTracker
// singleton, which pulls AnalyticsEventsQueue and therefore the real environment
// validation in at import time. Same stub every other pusher test uses.
vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

import type { SocketData } from "../../src/pusher/models/Websocket/SocketData";
import type { AnalyticsEventInput, AnalyticsEventsQueue } from "../../src/pusher/services/AnalyticsEventsQueue";
import {
    MAX_EVENTS_PER_REPORT_MESSAGE,
    processAnalyticsReportMessage,
} from "../../src/pusher/services/AnalyticsReportMessageHandler";

type QueueMock = Pick<AnalyticsEventsQueue, "enqueueEvent"> & {
    enqueueEvent: ReturnType<typeof vi.fn<(event: AnalyticsEventInput, socketData: SocketData) => void>>;
};

function newQueue(): QueueMock {
    return { enqueueEvent: vi.fn<(event: AnalyticsEventInput, socketData: SocketData) => void>() };
}

function newTracker() {
    return { open: vi.fn(), close: vi.fn() };
}

function newSocketData(): SocketData {
    return {
        userUuid: "reporter-uuid",
        roomId: "https://play.test/@/team/world/room",
        world: "world",
        spaceUserId: "reporter-space-user",
    } as unknown as SocketData;
}

function buildEvent(overrides: Partial<{ source: string; eventName: string; eventId: string }> = {}) {
    return {
        eventName: overrides.eventName ?? "chat.message_sent",
        source: (overrides.source ?? "front") as never,
        clientEventTimeMs: 1_000,
        eventId: overrides.eventId ?? "event-id",
        properties: { schemaVersion: 1 },
    };
}

function controlFrame(eventName: string, properties: Record<string, unknown>) {
    return { eventName, source: "front" as never, clientEventTimeMs: 1_000, eventId: `id:${eventName}`, properties };
}

describe("processAnalyticsReportMessage", () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        // vi.spyOn returns the existing spy if console.warn is already wrapped,
        // and its call history persists across tests. Restoring after each test
        // makes sure the next beforeEach starts from a pristine console.warn
        // (and therefore a fresh call count on the new spy).
        warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    it("forwards a normal-sized batch of front and media events to the queue", () => {
        const queue = newQueue();
        processAnalyticsReportMessage(
            { events: [buildEvent({ source: "front" }), buildEvent({ source: "media", eventId: "event-2" })] },
            newSocketData(),
            queue,
        );

        expect(queue.enqueueEvent).toHaveBeenCalledTimes(2);
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it("drops the entire message when the per-message cap is exceeded", () => {
        const queue = newQueue();
        const events = Array.from({ length: MAX_EVENTS_PER_REPORT_MESSAGE + 1 }, (_, i) =>
            buildEvent({ eventId: `event-${i}` }),
        );

        processAnalyticsReportMessage({ events }, newSocketData(), queue);

        expect(queue.enqueueEvent).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
            "Analytics report message exceeds max events per message — dropping",
            expect.objectContaining({
                received: MAX_EVENTS_PER_REPORT_MESSAGE + 1,
                max: MAX_EVENTS_PER_REPORT_MESSAGE,
                reporterUserUuid: "reporter-uuid",
            }),
        );
    });

    it("accepts exactly MAX_EVENTS_PER_REPORT_MESSAGE events", () => {
        const queue = newQueue();
        const events = Array.from({ length: MAX_EVENTS_PER_REPORT_MESSAGE }, (_, i) =>
            buildEvent({ eventId: `event-${i}` }),
        );

        processAnalyticsReportMessage({ events }, newSocketData(), queue);

        expect(queue.enqueueEvent).toHaveBeenCalledTimes(MAX_EVENTS_PER_REPORT_MESSAGE);
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('drops events claiming source "pusher" to defeat client-side source spoofing', () => {
        const queue = newQueue();
        processAnalyticsReportMessage({ events: [buildEvent({ source: "pusher" })] }, newSocketData(), queue);

        expect(queue.enqueueEvent).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
            "Analytics event dropped: invalid client source",
            expect.objectContaining({ source: "pusher" }),
        );
    });

    it.each(["user.connected", "user.disconnected", "media.video_quality.sample"])(
        'drops "%s" reported by a client: the name is reserved for the backend',
        (eventName) => {
            const queue = newQueue();
            // A legal client source is deliberately used here: guarding the source
            // alone does not stop this. The admin projects user.disconnected into
            // analytics_connection_sessions using the event's own connectedAt /
            // durationSeconds, so a forged one would let a browser invent its own
            // session durations.
            processAnalyticsReportMessage(
                { events: [buildEvent({ source: "front", eventName })] },
                newSocketData(),
                queue,
            );

            expect(queue.enqueueEvent).not.toHaveBeenCalled();
            expect(warnSpy).toHaveBeenCalledWith(
                "Analytics event dropped: event name is reserved for the backend",
                expect.objectContaining({ eventName }),
            );
        },
    );

    it("keeps accepting other media.* events: only the exact reserved name is closed", () => {
        const queue = newQueue();
        processAnalyticsReportMessage(
            { events: [buildEvent({ source: "media", eventName: "media.camera.enabled" })] },
            newSocketData(),
            queue,
        );

        expect(queue.enqueueEvent).toHaveBeenCalledTimes(1);
    });

    it.each([
        ["eventName", { eventName: "a".repeat(256) }],
        ["eventId", { eventId: "b".repeat(256) }],
    ])("drops events whose %s exceeds the 255 chars the admin accepts", (_label, overrides) => {
        const queue = newQueue();
        // The admin validator caps both at 255 and answers 422. That 422 makes the
        // queue re-send the whole batch one event at a time, and a throttled run
        // then counts the rest as send failures that are never requeued — so one
        // oversized name from one client costs everyone else's events in the batch.
        // Drop it here instead.
        processAnalyticsReportMessage({ events: [buildEvent(overrides)] }, newSocketData(), queue);

        expect(queue.enqueueEvent).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith("Analytics event dropped: malformed envelope", expect.any(Object));
    });

    it("drops events whose properties are not an object", () => {
        const queue = newQueue();
        // properties is google.protobuf.Value on the wire, so it reaches us as `any`:
        // a scalar passes the byte cap (JSON.stringify(42) is 2 bytes) and is only
        // rejected by the admin, poisoning the batch it travels in.
        const event = { ...buildEvent(), properties: 42 as never };
        processAnalyticsReportMessage({ events: [event] }, newSocketData(), queue);

        expect(queue.enqueueEvent).not.toHaveBeenCalled();
    });

    it("accepts an event sitting exactly on the length limit", () => {
        const queue = newQueue();
        processAnalyticsReportMessage(
            { events: [buildEvent({ eventName: "c".repeat(255), eventId: "d".repeat(255) })] },
            newSocketData(),
            queue,
        );

        expect(queue.enqueueEvent).toHaveBeenCalledTimes(1);
    });

    it("drops events with an unknown source value", () => {
        const queue = newQueue();
        processAnalyticsReportMessage({ events: [buildEvent({ source: "shenanigans" })] }, newSocketData(), queue);

        expect(queue.enqueueEvent).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalled();
    });

    it("forwards valid events when the same batch contains invalid ones", () => {
        const queue = newQueue();
        processAnalyticsReportMessage(
            {
                events: [
                    buildEvent({ source: "pusher", eventId: "invalid" }),
                    buildEvent({ source: "front", eventId: "valid" }),
                ],
            },
            newSocketData(),
            queue,
        );

        expect(queue.enqueueEvent).toHaveBeenCalledTimes(1);
        expect(queue.enqueueEvent).toHaveBeenCalledWith(
            expect.objectContaining({ eventId: "valid", source: "front" }),
            expect.any(Object),
        );
    });

    /**
     * The seam between the two halves of the timed-event mechanism, and the one place
     * where they can disagree in silence.
     *
     * The front states why it closed an interval; the pusher parses that string
     * against an enum and coerces anything unknown to "other" rather than losing the
     * interval. That coercion is right, but it means a reason the front actually sends
     * and the enum does not list is destroyed with no error anywhere -- which is
     * exactly what happened to every front-initiated close until this test existed.
     */
    it.each(["left_conversation", "type_changed", "cleanup"])(
        "keeps the reason the front actually sends: %s",
        (endReason) => {
            const queue = newQueue();
            const tracker = newTracker();

            processAnalyticsReportMessage(
                { events: [controlFrame("timed_event.close", { handle: "conversation.ended:h1", endReason })] },
                newSocketData(),
                queue,
                tracker
            );

            expect(tracker.close).toHaveBeenCalledWith("conversation.ended:h1", expect.any(Object), endReason);
        }
    );

    it("coerces a reason it does not know rather than dropping the interval", () => {
        const queue = newQueue();
        const tracker = newTracker();

        processAnalyticsReportMessage(
            { events: [controlFrame("timed_event.close", { handle: "h1", endReason: "wharrgarbl" })] },
            newSocketData(),
            queue,
            tracker
        );

        expect(tracker.close).toHaveBeenCalledWith("h1", expect.any(Object), "other");
    });

    it("treats the control frames as instructions, never as events", () => {
        const queue = newQueue();
        const tracker = newTracker();

        processAnalyticsReportMessage(
            {
                events: [
                    controlFrame("timed_event.open", {
                        handle: "conversation.ended:h1",
                        eventName: "conversation.ended",
                        properties: { conversationType: "meeting" },
                    }),
                    controlFrame("timed_event.close", { handle: "conversation.ended:h1" }),
                ],
            },
            newSocketData(),
            queue,
            tracker
        );

        expect(tracker.open).toHaveBeenCalledTimes(1);
        expect(tracker.close).toHaveBeenCalledTimes(1);
        // Grepping the admin for timed_event.* finds nothing, and that is the point:
        // these frames drive the tracker and must never reach the pipeline themselves.
        expect(queue.enqueueEvent).not.toHaveBeenCalled();
    });
});
