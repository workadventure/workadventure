import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The handler defaults its tracker argument to the analyticsTimedEventTracker
// singleton, which pulls AnalyticsEventsQueue and therefore the real environment
// validation in at import time. Same stub every other pusher test uses.
vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

import type { SocketData } from "../../src/pusher/models/Websocket/SocketData";
import type { AnalyticsEventInput, AnalyticsEventsQueue } from "../../src/pusher/services/AnalyticsEventsQueue";
import { MAX_EVENT_PROPERTIES_BYTES } from "../../src/pusher/services/AnalyticsEventsQueue";
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

    it("forwards a normal-sized batch of catalogued events to the queue", () => {
        const queue = newQueue();
        processAnalyticsReportMessage(
            {
                events: [buildEvent(), buildEvent({ eventName: "menu.opened", eventId: "event-2" })],
            },
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

    it("keeps accepting other media.* events: only the synthesized name is closed", () => {
        const queue = newQueue();
        // The `media.` prefix is not blanket-reserved — the front legitimately emits
        // plenty of them. Only the names the catalog pins to source "pusher" are.
        processAnalyticsReportMessage(
            { events: [buildEvent({ eventName: "media.camera.toggled" })] },
            newSocketData(),
            queue,
        );

        expect(queue.enqueueEvent).toHaveBeenCalledTimes(1);
    });

    it.each([
        ["left_conversation", "closed_by_client"],
        ["left_area", "closed_by_client"],
        ["status_changed", "closed_by_client"],
        ["cleanup", "closed_by_client"],
        ["other", "superseded"],
    ])("translates the retired end reason %s into %s", (legacy, expected) => {
        // A tab loaded before the reason set was trimmed still sends the old string.
        // Mapping it beats losing the interval — and beats `.catch()`-ing it into a
        // bucket that would make a stale-handle close look like a clean one.
        const queue = newQueue();
        const tracker = newTracker();
        processAnalyticsReportMessage(
            { events: [controlFrame("timed_event.close", { handle: "h1", endReason: legacy })] },
            newSocketData(),
            queue,
            tracker,
        );

        expect(tracker.close).toHaveBeenCalledWith("h1", expect.anything(), expected);
    });

    it("falls back to closed_by_client for a reason it has never heard of", () => {
        const queue = newQueue();
        const tracker = newTracker();
        processAnalyticsReportMessage(
            { events: [controlFrame("timed_event.close", { handle: "h1", endReason: "nonsense" })] },
            newSocketData(),
            queue,
            tracker,
        );

        expect(tracker.close).toHaveBeenCalledWith("h1", expect.anything(), "closed_by_client");
    });

    it("refuses to open a timed event the client may not have synthesized", () => {
        // The open frame is the one place a client still names an event as a free
        // string. Without this the frame is a name-forging primitive: the pusher
        // would emit `user.disconnected` signed source "pusher", which the admin
        // projects straight into analytics_connection_sessions.
        const queue = newQueue();
        const tracker = newTracker();
        processAnalyticsReportMessage(
            { events: [controlFrame("timed_event.open", { handle: "h1", eventName: "user.disconnected" })] },
            newSocketData(),
            queue,
            tracker,
        );

        expect(tracker.open).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith("Timed event open dropped: malformed control frame", expect.any(Object));
    });

    it("refuses to open a timed event whose payload does not match the catalog", () => {
        // area.dwell declares areaId and areaName. An open frame missing them would
        // otherwise produce a stored row the catalog does not describe.
        const queue = newQueue();
        const tracker = newTracker();
        processAnalyticsReportMessage(
            { events: [controlFrame("timed_event.open", { handle: "h1", eventName: "area.dwell" })] },
            newSocketData(),
            queue,
            tracker,
        );

        expect(tracker.open).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
            "Timed event open dropped: payload does not match the catalog",
            expect.objectContaining({ eventName: "area.dwell" }),
        );
    });

    it("drops an event whose name is not in the catalog", () => {
        const queue = newQueue();
        processAnalyticsReportMessage(
            { events: [buildEvent({ eventName: "totally.made.up" })] },
            newSocketData(),
            queue,
        );

        expect(queue.enqueueEvent).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
            "Analytics event dropped: unknown event name",
            expect.objectContaining({ eventName: "totally.made.up" }),
        );
    });

    it("distinguishes an unknown name from a forged backend name in the logs", () => {
        // Two different problems: one is a client that is out of date or wrong, the
        // other is a client claiming an event the admin trusts. Collapsing them into
        // one log line loses the only signal that separates noise from an attempt.
        const queue = newQueue();
        processAnalyticsReportMessage(
            { events: [buildEvent({ eventName: "totally.made.up" }), buildEvent({ eventName: "user.disconnected" })] },
            newSocketData(),
            queue,
        );

        expect(warnSpy).toHaveBeenCalledWith(
            "Analytics event dropped: unknown event name",
            expect.objectContaining({ eventName: "totally.made.up" }),
        );
        expect(warnSpy).toHaveBeenCalledWith(
            "Analytics event dropped: event name is reserved for the backend",
            expect.objectContaining({ eventName: "user.disconnected" }),
        );
    });

    it("drops a catalogued event whose required property is missing", () => {
        const queue = newQueue();
        // room.visited declares a required roomId. Before the catalog was the gate,
        // this reached the admin and was rejected there — with a 422 that cost the
        // rest of the batch a one-by-one resend.
        processAnalyticsReportMessage(
            { events: [{ ...buildEvent({ eventName: "room.visited" }), properties: {} }] },
            newSocketData(),
            queue,
        );

        expect(queue.enqueueEvent).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
            "Analytics event dropped: payload does not match the catalog",
            expect.objectContaining({ eventName: "room.visited" }),
        );
    });

    it("keeps an unknown property on a catalogued event", () => {
        const queue = newQueue();
        // The rolling-deploy case: a long-lived tab running a newer front sends a
        // field this pusher's catalog does not declare yet. `passthrough()` is what
        // stops that field being silently dropped on the way to the admin — only the
        // event NAME is closed, not its payload.
        processAnalyticsReportMessage(
            {
                events: [{ ...buildEvent({ eventName: "menu.opened" }), properties: { somethingNewer: "keep me" } }],
            },
            newSocketData(),
            queue,
        );

        expect(queue.enqueueEvent).toHaveBeenCalledTimes(1);
        expect(queue.enqueueEvent.mock.calls[0][0].properties).toMatchObject({ somethingNewer: "keep me" });
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

    it("drops events whose eventId exceeds the 255 chars the admin accepts", () => {
        const queue = newQueue();
        // The admin validator caps eventId at 255 and answers 422. That 422 makes the
        // queue re-send the whole batch one event at a time, and a throttled run then
        // counts the rest as send failures that are never requeued — so one oversized
        // id from one client costs everyone else's events in the batch. The event
        // NAME no longer needs this guard: an over-long name is simply not catalogued.
        processAnalyticsReportMessage({ events: [buildEvent({ eventId: "b".repeat(256) })] }, newSocketData(), queue);

        expect(queue.enqueueEvent).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
            "Analytics event dropped: payload does not match the catalog",
            expect.any(Object),
        );
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
     * against an enum and coerces anything unknown rather than losing the interval.
     * That coercion is right, but it means a reason the front actually sends and the
     * enum does not list is destroyed with no error anywhere -- which is exactly what
     * happened to every front-initiated close until this test existed. The front's
     * `close()` is typed to ClientTimedEventEndReason now, so these three are the
     * complete set it can send.
     */
    it.each(["closed_by_client", "type_changed", "superseded"])(
        "keeps the reason the front actually sends: %s",
        (endReason) => {
            const queue = newQueue();
            const tracker = newTracker();

            processAnalyticsReportMessage(
                { events: [controlFrame("timed_event.close", { handle: "conversation.ended:h1", endReason })] },
                newSocketData(),
                queue,
                tracker,
            );

            expect(tracker.close).toHaveBeenCalledWith("conversation.ended:h1", expect.any(Object), endReason);
        },
    );

    it("treats the control frames as instructions, never as events", () => {
        const queue = newQueue();
        const tracker = newTracker();

        processAnalyticsReportMessage(
            {
                events: [
                    controlFrame("timed_event.open", {
                        handle: "conversation.ended:h1",
                        eventName: "conversation.ended",
                        properties: {
                            schemaVersion: 1,
                            conversationId: "group:3",
                            conversationType: "meeting",
                        },
                    }),
                    controlFrame("timed_event.close", { handle: "conversation.ended:h1" }),
                ],
            },
            newSocketData(),
            queue,
            tracker,
        );

        expect(tracker.open).toHaveBeenCalledTimes(1);
        expect(tracker.close).toHaveBeenCalledTimes(1);
        // Grepping the admin for timed_event.* finds nothing, and that is the point:
        // these frames drive the tracker and must never reach the pipeline themselves.
        expect(queue.enqueueEvent).not.toHaveBeenCalled();
    });
});

describe("control frame payload bounds", () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    it("refuses an open frame whose properties blow the 8 KiB cap", () => {
        // An open frame is RETAINED until its interval closes, and the queue's own
        // cap never sees it — so without this the frame is a memory-pinning
        // primitive: 32 handles x a 16 MiB websocket frame, held until disconnect.
        const queue = newQueue();
        const tracker = newTracker();
        processAnalyticsReportMessage(
            {
                events: [
                    controlFrame("timed_event.open", {
                        handle: "h1",
                        eventName: "area.dwell",
                        properties: { areaId: "a", areaName: "b", blob: "x".repeat(9 * 1024) },
                    }),
                ],
            },
            newSocketData(),
            queue,
            tracker,
        );

        expect(tracker.open).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
            "Timed event open dropped: properties too large or not serializable",
            expect.objectContaining({ eventName: "area.dwell" }),
        );
    });

    it("measures the cap in UTF-8 bytes, not UTF-16 code units", () => {
        // 5000 CJK characters: under the cap by `.length`, three times over it in
        // bytes. Same trap the queue's cap already documents.
        const blob = "世".repeat(5000);
        expect(blob.length).toBeLessThan(MAX_EVENT_PROPERTIES_BYTES);

        const queue = newQueue();
        const tracker = newTracker();
        processAnalyticsReportMessage(
            {
                events: [
                    controlFrame("timed_event.open", {
                        handle: "h1",
                        eventName: "area.dwell",
                        properties: { areaId: "a", areaName: "b", blob },
                    }),
                ],
            },
            newSocketData(),
            queue,
            tracker,
        );

        expect(tracker.open).not.toHaveBeenCalled();
    });

    it("still accepts an open frame of a reasonable size", () => {
        const queue = newQueue();
        const tracker = newTracker();
        processAnalyticsReportMessage(
            {
                events: [
                    controlFrame("timed_event.open", {
                        handle: "h1",
                        eventName: "area.dwell",
                        properties: { areaId: "meeting-room", areaName: "Meeting room" },
                    }),
                ],
            },
            newSocketData(),
            queue,
            tracker,
        );

        expect(tracker.open).toHaveBeenCalledTimes(1);
    });
});
