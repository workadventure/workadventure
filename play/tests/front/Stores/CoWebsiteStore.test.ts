import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyticsClient } from "../../../src/front/Administration/AnalyticsClient";
import type { CoWebsite } from "../../../src/front/WebRtc/CoWebsite/CoWebsite";
import { createCoWebsiteStore } from "../../../src/front/Stores/CoWebsiteStore";

const makeSender = () => vi.fn();

function fakeCoWebsite(id: string, url = `https://${id}.example`): CoWebsite {
    return {
        getId: () => id,
        getUrl: () => new URL(url),
        getWidthPercent: () => undefined,
    } as unknown as CoWebsite;
}

function framesFrom(sendAdmin: ReturnType<typeof makeSender>) {
    const events = sendAdmin.mock.calls.flatMap(([message]) => message.events);
    return {
        opens: events.filter((event: { eventName: string }) => event.eventName === "timed_event.open"),
        closes: events.filter((event: { eventName: string }) => event.eventName === "timed_event.close"),
    };
}

/**
 * The interval that measures a cowebsite visit lives here now, next to the thing it
 * measures. These used to be written against the analytics client's own map of ids,
 * which meant they proved that map worked — not that opening and closing a cowebsite
 * produced one interval. They go through the store's real API now: add, remove,
 * keepOnly, empty.
 */
describe("CoWebsiteStore analytics intervals", () => {
    let sendAdmin: ReturnType<typeof makeSender>;

    beforeEach(() => {
        sendAdmin = makeSender();
        analyticsClient.setAdminAnalyticsSender(sendAdmin);
        window.capabilities = { "api/analytics/events-batch": "v1" };
    });

    afterEach(() => {
        analyticsClient.setAdminAnalyticsSender(undefined);
        window.capabilities = {};
        delete window.posthog;
        vi.restoreAllMocks();
    });

    it("opens one interval per cowebsite, carrying the context the caller gave", () => {
        const store = createCoWebsiteStore();

        store.add(fakeCoWebsite("cowebsite-1", "https://example.com/secured/file.pdf?token=secret#frag"), undefined, {
            targetUrl: "https://example.com/files/file.pdf?sas=otherSecret",
            triggerProperty: "openLink",
            areaId: "docs-zone",
            areaName: "Docs zone",
        });

        const { opens } = framesFrom(sendAdmin);
        expect(opens).toHaveLength(1);
        expect(opens[0].properties).toEqual(
            expect.objectContaining({
                eventName: "cowebsite.closed",
                properties: {
                    url: "https://example.com",
                    targetUrl: "https://example.com",
                    mediaKind: "pdf",
                    triggerProperty: "openLink",
                    fileName: "file.pdf",
                    fileExtension: "pdf",
                    areaId: "docs-zone",
                    areaName: "Docs zone",
                    schemaVersion: 1,
                },
            }),
        );
    });

    it("measures each cowebsite separately, so closing one leaves the others open", () => {
        const store = createCoWebsiteStore();
        const first = fakeCoWebsite("cowebsite-1");
        const second = fakeCoWebsite("cowebsite-2");

        store.add(first);
        store.add(second);
        store.remove(first);

        const { opens, closes } = framesFrom(sendAdmin);
        expect(opens).toHaveLength(2);
        expect(closes).toHaveLength(1);
        expect(closes[0].properties.handle).toBe(opens[0].properties.handle);
    });

    it("closes the visits that keepOnly drops, which is the case no caller could report", () => {
        // keepOnly takes a predicate: it does not know what it removed, and neither did
        // the code that used to have to tell the analytics client. Sixteen call sites
        // remove a cowebsite and exactly one used to report a close.
        const store = createCoWebsiteStore();
        store.add(fakeCoWebsite("keep-me"));
        store.add(fakeCoWebsite("drop-me"));

        store.keepOnly((coWebsite) => coWebsite.getId() === "keep-me");

        const { opens, closes } = framesFrom(sendAdmin);
        expect(closes).toHaveLength(1);
        expect(closes[0].properties.handle).toBe(opens[1].properties.handle);
    });

    it("closes every visit when the store is emptied", () => {
        const store = createCoWebsiteStore();
        store.add(fakeCoWebsite("cowebsite-1"));
        store.add(fakeCoWebsite("cowebsite-2"));

        store.empty();

        expect(framesFrom(sendAdmin).closes).toHaveLength(2);
    });

    it("ends the previous visit when the same id is opened twice", () => {
        // The close never arrived — end that visit here rather than stranding it until
        // the socket dies, which would date it to the end of the session.
        const store = createCoWebsiteStore();
        store.add(fakeCoWebsite("cowebsite-1"));
        store.add(fakeCoWebsite("cowebsite-1"));

        const { opens, closes } = framesFrom(sendAdmin);
        expect(opens).toHaveLength(2);
        expect(closes).toHaveLength(1);
        expect(closes[0].properties.handle).toBe(opens[0].properties.handle);
    });

    it("still opens the cowebsite when the admin sink is off", () => {
        // The store must not learn what a capability is: it gets a handle either way,
        // and the one it gets here simply measures nothing.
        window.capabilities = {};
        const store = createCoWebsiteStore();

        store.add(fakeCoWebsite("cowebsite-1"));
        store.empty();

        expect(sendAdmin).not.toHaveBeenCalled();
        expect(store.findById("cowebsite-1")).toBeUndefined();
    });
});
