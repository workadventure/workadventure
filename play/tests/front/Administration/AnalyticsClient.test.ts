import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyticsClient } from "../../../src/front/Administration/AnalyticsClient";

describe("AnalyticsClient admin analytics sink", () => {
    beforeEach(() => {
        // analyticsClient is a singleton, so an interval left open by one test would
        // still be open in the next. Dropping the sender is what a disconnect does,
        // and it clears them.
        analyticsClient.setAdminAnalyticsSender(undefined);
    });

    afterEach(() => {
        analyticsClient.setAdminAnalyticsSender(undefined);
        window.capabilities = {};
        delete window.posthog;
        vi.restoreAllMocks();
    });

    it("does not send admin events without the generic analytics capability", () => {
        const sendAdmin = vi.fn();
        analyticsClient.setAdminAnalyticsSender(sendAdmin);
        window.capabilities = {};

        analyticsClient.openSayBubble();

        expect(sendAdmin).not.toHaveBeenCalled();
    });

    it("keeps PostHog active and sends allowlisted admin events when capability is present", () => {
        const sendAdmin = vi.fn();
        const capture = vi.fn();
        analyticsClient.setAdminAnalyticsSender(sendAdmin);
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };
        window.posthog = { capture } as never;

        analyticsClient.addMapEditorProperty("area", "openWebsite");

        expect(capture).toHaveBeenCalledWith("wa_map-editor_add_property", {
            name: "openWebsite",
            type: "area",
        });
        expect(sendAdmin).toHaveBeenCalledWith({
            events: [
                expect.objectContaining({
                    eventName: "map_editor.property.added",
                    source: "front",
                    properties: {
                        name: "openWebsite",
                        type: "area",
                    },
                }),
            ],
        });
    });

    it("strips the query string and fragment from the map URL", () => {
        const sendAdmin = vi.fn();
        analyticsClient.setAdminAnalyticsSender(sendAdmin);
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };

        analyticsClient.mapLoadingStarted("https://maps.example.com/team/secret-map.wam?token=abc123#section");

        expect(sendAdmin).toHaveBeenCalledWith({
            events: [
                expect.objectContaining({
                    eventName: "map_loading.started",
                    source: "front",
                    properties: {
                        mapUrl: "https://maps.example.com/team/secret-map.wam",
                    },
                }),
            ],
        });
    });

    it("tracks bubble lock and chat actions in the admin sink", () => {
        const sendAdmin = vi.fn();
        analyticsClient.setAdminAnalyticsSender(sendAdmin);
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };

        analyticsClient.lockDiscussion();
        analyticsClient.chatMessageSent("room");

        expect(sendAdmin).toHaveBeenCalledWith({
            events: [
                expect.objectContaining({
                    eventName: "bubble.lock.toggled",
                    source: "front",
                }),
            ],
        });
        expect(sendAdmin).toHaveBeenCalledWith({
            events: [
                expect.objectContaining({
                    eventName: "chat.message_sent",
                    source: "front",
                    properties: {
                        chatContext: "room",
                    },
                }),
            ],
        });
    });

    it("tracks say and think bubbles in the admin sink", () => {
        const sendAdmin = vi.fn();
        analyticsClient.setAdminAnalyticsSender(sendAdmin);
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };

        analyticsClient.openSayBubble();
        analyticsClient.openThinkBubble();

        expect(sendAdmin).toHaveBeenCalledWith({
            events: [
                expect.objectContaining({
                    eventName: "bubble.say.opened",
                    source: "front",
                }),
            ],
        });
        expect(sendAdmin).toHaveBeenCalledWith({
            events: [
                expect.objectContaining({
                    eventName: "bubble.think.opened",
                    source: "front",
                }),
            ],
        });
    });

    it("opens and closes one interval for an area visit", () => {
        const sendAdmin = vi.fn();
        analyticsClient.setAdminAnalyticsSender(sendAdmin);
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };

        analyticsClient.enterArea("area-1", "Focus room");
        analyticsClient.leaveArea("area-1", "Focus room");

        const events = sendAdmin.mock.calls.flatMap(([message]) => message.events);
        const opened = events.find((event) => event.eventName === "timed_event.open");
        const closed = events.find((event) => event.eventName === "timed_event.close");

        expect(opened?.properties).toEqual(
            expect.objectContaining({
                eventName: "area.dwell",
                properties: { areaId: "area-1", areaName: "Focus room" },
            })
        );
        // Same handle, or the pusher drops the close and the visit is lost.
        expect(closed?.properties.handle).toBe(opened?.properties.handle);
        expect(closed?.properties.endReason).toBe("left_area");
    });

    it("closes an area left open rather than orphaning it", () => {
        const sendAdmin = vi.fn();
        analyticsClient.setAdminAnalyticsSender(sendAdmin);
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };

        // Entering twice without leaving: the leave went missing. Overwriting the
        // handle would strand the first interval until the socket died, dating a
        // walk-through to the end of the session.
        analyticsClient.enterArea("area-1", "Focus room");
        analyticsClient.enterArea("area-1", "Focus room");

        const events = sendAdmin.mock.calls.flatMap(([message]) => message.events);
        const opens = events.filter((event) => event.eventName === "timed_event.open");
        const closes = events.filter((event) => event.eventName === "timed_event.close");

        expect(opens).toHaveLength(2);
        expect(closes).toHaveLength(1);
        expect(closes[0].properties.handle).toBe(opens[0].properties.handle);
    });

    it("tracks each area independently while several are open at once", () => {
        const sendAdmin = vi.fn();
        analyticsClient.setAdminAnalyticsSender(sendAdmin);
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };

        // Areas overlap on a map, so leaving one must not close the other.
        analyticsClient.enterArea("area-1", "Focus room");
        analyticsClient.enterArea("area-2", "Silent room");
        analyticsClient.leaveArea("area-1", "Focus room");

        const events = sendAdmin.mock.calls.flatMap(([message]) => message.events);
        const opens = events.filter((event) => event.eventName === "timed_event.open");
        const closes = events.filter((event) => event.eventName === "timed_event.close");

        expect(opens).toHaveLength(2);
        expect(closes).toHaveLength(1);
        expect(closes[0].properties.handle).toBe(opens[0].properties.handle);
    });

    it("opens and closes one interval for a screen share, without reporting a duration", () => {
        const sendAdmin = vi.fn();
        analyticsClient.setAdminAnalyticsSender(sendAdmin);
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };

        analyticsClient.screenSharingStarted("screen-share-session-1", true);
        analyticsClient.screenSharingEnded("screen-share-session-1");

        const events = sendAdmin.mock.calls.flatMap(([message]) => message.events);
        const opened = events.find((event) => event.eventName === "timed_event.open");
        const closed = events.find((event) => event.eventName === "timed_event.close");

        expect(opened?.properties).toEqual(
            expect.objectContaining({
                eventName: "meeting.screenshare.ended",
                properties: { screenShareSessionId: "screen-share-session-1", hasAudio: true },
            })
        );
        expect(closed?.properties.handle).toBe(opened?.properties.handle);
        // The caller cannot state a duration anymore: it used to send
        // max(1, round(now - startedAt)), a floor that invented a second.
        expect(JSON.stringify(events)).not.toContain("durationSeconds");
    });

    it("enriches cowebsite openings coming from world properties", () => {
        const sendAdmin = vi.fn();
        analyticsClient.setAdminAnalyticsSender(sendAdmin);
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };

        analyticsClient.openedWebsite(new URL("https://example.com/secured/file.pdf?token=secret#frag"), {
            targetUrl: "https://example.com/files/file.pdf?sas=otherSecret",
            triggerProperty: "openLink",
            areaId: "docs-zone",
            areaName: "Docs zone",
        });

        // The URL is reduced to its origin: query and hash carry auth tokens, and the
        // path would only be a second, unfiltered copy of the document name. The name
        // is reported once, as its own field, so anonymization and the Kiosk can each
        // drop that single field.
        expect(sendAdmin).toHaveBeenCalledWith({
            events: [
                expect.objectContaining({
                    eventName: "cowebsite.opened",
                    source: "front",
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
            ],
        });
    });

    it("reports the document name only in fileName, never inside the urls", () => {
        const sendAdmin = vi.fn();
        analyticsClient.setAdminAnalyticsSender(sendAdmin);
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };

        analyticsClient.openedWebsite(new URL("https://acme.tld/legal/NDA-acme-2026.pdf"), {
            targetUrl: "https://acme.tld/hr/salary-2026.xlsx",
        });

        const properties = sendAdmin.mock.calls[0][0].events[0].properties as Record<string, unknown>;
        // The name lives in exactly one field — that is the whole point. A single
        // field can be dropped by the anonymization allowlist and by the Kiosk
        // projection; a name buried in a URL cannot.
        expect(properties.fileName).toBe("salary-2026.xlsx");
        expect(properties.url).toBe("https://acme.tld");
        expect(properties.targetUrl).toBe("https://acme.tld");
        expect(properties.fileExtension).toBe("xlsx");
    });

    it("classifies generic website openings as website when no file extension is present", () => {
        const sendAdmin = vi.fn();
        analyticsClient.setAdminAnalyticsSender(sendAdmin);
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };

        analyticsClient.openedWebsite(new URL("https://example.com/workadventure"), {
            triggerProperty: "other",
        });

        expect(sendAdmin).toHaveBeenCalledWith({
            events: [
                expect.objectContaining({
                    eventName: "cowebsite.opened",
                    source: "front",
                    properties: expect.objectContaining({
                        targetUrl: "https://example.com",
                        mediaKind: "website",
                        triggerProperty: "other",
                    }),
                }),
            ],
        });
    });
});
