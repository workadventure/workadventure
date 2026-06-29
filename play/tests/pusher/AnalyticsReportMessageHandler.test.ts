import { beforeEach, describe, expect, it, vi } from "vitest";
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
        eventName: overrides.eventName ?? "area.entered",
        source: (overrides.source ?? "front") as never,
        clientEventTimeMs: 1_000,
        eventId: overrides.eventId ?? "event-id",
        properties: { schemaVersion: 1 },
    };
}

describe("processAnalyticsReportMessage", () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
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
});
