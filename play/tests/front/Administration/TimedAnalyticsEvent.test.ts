import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyticsClient } from "../../../src/front/Administration/AnalyticsClient";
import {
    TimedEventsByKey,
    type TimedAnalyticsEventHandle,
} from "../../../src/front/Administration/TimedAnalyticsEvent";

const makeSender = () => vi.fn();

function framesFrom(sendAdmin: ReturnType<typeof makeSender>) {
    const events = sendAdmin.mock.calls.flatMap(([message]) => message.events);
    return {
        opens: events.filter((event: { eventName: string }) => event.eventName === "timed_event.open"),
        closes: events.filter((event: { eventName: string }) => event.eventName === "timed_event.close"),
    };
}

/** A handle that records whether it was closed, and how many times. */
function spyHandle(): TimedAnalyticsEventHandle & { closed: () => number } {
    const close = vi.fn();
    return { close, closed: () => close.mock.calls.length };
}

describe("TimedEventsByKey", () => {
    it("ends the interval a key was already measuring rather than overwriting it", () => {
        // The bug this exists to prevent: an overwritten handle has nothing left that
        // could close it, so the pusher only ends that interval when the socket dies —
        // which dates a walk through an area to the end of the session.
        const events = new TimedEventsByKey();
        const first = spyHandle();
        const second = spyHandle();

        events.replace("area-1", first);
        events.replace("area-1", second);

        expect(first.closed()).toBe(1);
        expect(second.closed()).toBe(0);
    });

    it("keeps keys independent, so closing one leaves the others measuring", () => {
        // Areas overlap on a map and cowebsites sit side by side; this is the whole
        // reason these two are keyed where a screen share or a broadcast is not.
        const events = new TimedEventsByKey();
        const one = spyHandle();
        const two = spyHandle();

        events.replace("area-1", one);
        events.replace("area-2", two);
        events.close("area-1");

        expect(one.closed()).toBe(1);
        expect(two.closed()).toBe(0);
    });

    it("closes a key once, however often it is asked", () => {
        const events = new TimedEventsByKey();
        const handle = spyHandle();

        events.replace("area-1", handle);
        events.close("area-1");
        events.close("area-1");

        expect(handle.closed()).toBe(1);
    });

    it("closes everything on teardown", () => {
        const events = new TimedEventsByKey();
        const one = spyHandle();
        const two = spyHandle();

        events.replace("area-1", one);
        events.replace("area-2", two);
        events.closeAll();

        expect(one.closed()).toBe(1);
        expect(two.closed()).toBe(1);
    });
});

/**
 * The interval semantics themselves, exercised through the client's public entry.
 *
 * These used to live in AnalyticsClient.test.ts, driving methods like enterArea and
 * screenSharingStarted that each kept their own handle. The handles live with the
 * things they measure now, so what is left to test is what the intervals do — which
 * is here, not spread across four stores that cannot be imported in a test.
 */
describe("openTimedEvent and the reconnect registry", () => {
    let sendAdmin: ReturnType<typeof makeSender>;

    beforeEach(() => {
        sendAdmin = makeSender();
        window.capabilities = { "api/analytics/events-batch": "v1" };
        analyticsClient.setAdminAnalyticsSender(sendAdmin);
    });

    afterEach(() => {
        analyticsClient.setAdminAnalyticsSender(undefined);
        window.capabilities = {};
        vi.restoreAllMocks();
    });

    it("reports one interval, paired by handle, and states no duration", () => {
        const stay = analyticsClient.openTimedEvent("area.dwell", { areaId: "area-1", areaName: "Focus room" });
        stay.close();

        const { opens, closes } = framesFrom(sendAdmin);
        expect(opens[0].properties).toEqual(
            expect.objectContaining({
                eventName: "area.dwell",
                properties: { areaId: "area-1", areaName: "Focus room" },
            }),
        );
        // Same handle, or the pusher drops the close and the stay is lost.
        expect(closes[0].properties.handle).toBe(opens[0].properties.handle);
        // The close states only the handle: the pusher decides the reason, and the
        // client cannot claim a length. It used to send max(1, round(now - start)),
        // a floor that turned a 200ms share into a reported second.
        expect(closes[0].properties.endReason).toBeUndefined();
        expect(JSON.stringify(closes)).not.toContain("durationSeconds");
    });

    it("closes once, however often the holder asks", () => {
        const stay = analyticsClient.openTimedEvent("status.dwell", { status: "ONLINE" });
        stay.close();
        stay.close();

        expect(framesFrom(sendAdmin).closes).toHaveLength(1);
    });

    it("resumes an interval the socket ended but the user did not", () => {
        // The case the whole mechanism exists for: a reconnect ends the interval on the
        // pusher's side, nothing fires a second start — the broadcast never stopped,
        // the user is still in the area — and without this the rest of that stay is
        // invisible for the lifetime of the tab.
        const broadcast = analyticsClient.openTimedEvent("megaphone.ended", {}, { reopenOnReconnect: true });

        analyticsClient.setAdminAnalyticsSender(undefined);
        const secondSocket = makeSender();
        analyticsClient.setAdminAnalyticsSender(secondSocket);

        const reopened = framesFrom(secondSocket).opens;
        expect(reopened).toHaveLength(1);
        expect(reopened[0].properties.eventName).toBe("megaphone.ended");

        // And it is a NEW interval, not the spent one: closing it must pair with the
        // handle just reopened, or the pusher drops the close and the stay is lost.
        broadcast.close();
        const closes = framesFrom(secondSocket).closes;
        expect(closes).toHaveLength(1);
        expect(closes[0].properties.handle).toBe(reopened[0].properties.handle);
    });

    it("leaves an interval ended when it did not ask to be resumed", () => {
        analyticsClient.openTimedEvent("area.dwell", { areaId: "area-1", areaName: "Focus room" });

        analyticsClient.setAdminAnalyticsSender(undefined);
        const secondSocket = makeSender();
        analyticsClient.setAdminAnalyticsSender(secondSocket);

        expect(framesFrom(secondSocket).opens).toHaveLength(0);
    });

    it("says nothing over the new socket for an interval the old one already ended", () => {
        // The holder keeps its reference across the reconnect and closes it whenever
        // the user closes the thing. That close must be silent: the pusher recorded
        // this interval as socket_closed, and a second close would be dropped there as
        // unpaired — a frame that travelled for nothing.
        const visit = analyticsClient.openTimedEvent("cowebsite.closed", {
            url: "https://example.com",
            targetUrl: "https://example.com",
            mediaKind: "website",
            triggerProperty: "other",
            fileName: null,
            fileExtension: null,
            schemaVersion: 1,
        });

        analyticsClient.setAdminAnalyticsSender(undefined);
        const secondSocket = makeSender();
        analyticsClient.setAdminAnalyticsSender(secondSocket);
        visit.close();

        expect(framesFrom(secondSocket).closes).toHaveLength(0);
    });

    it("stops resuming once the user has ended it, even while disconnected", () => {
        const broadcast = analyticsClient.openTimedEvent("megaphone.ended", {}, { reopenOnReconnect: true });

        analyticsClient.setAdminAnalyticsSender(undefined);
        broadcast.close();

        const secondSocket = makeSender();
        analyticsClient.setAdminAnalyticsSender(secondSocket);

        expect(secondSocket).not.toHaveBeenCalled();
    });

    it("measures nothing, and complains about nothing, without the capability", () => {
        window.capabilities = {};
        const stay = analyticsClient.openTimedEvent("area.dwell", { areaId: "area-1", areaName: "Focus room" });
        stay.close();

        expect(sendAdmin).not.toHaveBeenCalled();
    });
});
