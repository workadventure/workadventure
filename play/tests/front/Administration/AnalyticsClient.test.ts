import { afterEach, describe, expect, it, vi } from "vitest";
import { analyticsClient } from "../../../src/front/Administration/AnalyticsClient";

describe("AnalyticsClient admin analytics sink", () => {
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

    it("tracks area enter and leave events in the admin sink", () => {
        const sendAdmin = vi.fn();
        analyticsClient.setAdminAnalyticsSender(sendAdmin);
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };

        analyticsClient.enterArea("area-1", "Focus room");
        analyticsClient.leaveArea("area-1", "Focus room");

        expect(sendAdmin).toHaveBeenCalledWith({
            events: [
                expect.objectContaining({
                    eventName: "area.entered",
                    source: "front",
                    properties: {
                        areaId: "area-1",
                        areaName: "Focus room",
                    },
                }),
            ],
        });
        expect(sendAdmin).toHaveBeenCalledWith({
            events: [
                expect.objectContaining({
                    eventName: "area.left",
                    source: "front",
                    properties: {
                        areaId: "area-1",
                        areaName: "Focus room",
                    },
                }),
            ],
        });
    });

    it("tracks screen sharing start and end events in the admin sink", () => {
        const sendAdmin = vi.fn();
        analyticsClient.setAdminAnalyticsSender(sendAdmin);
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };

        analyticsClient.screenSharingStarted("screen-share-session-1", true);
        analyticsClient.screenSharingEnded("screen-share-session-1", 42, true);

        expect(sendAdmin).toHaveBeenCalledWith({
            events: [
                expect.objectContaining({
                    eventName: "meeting.screenshare.started",
                    source: "front",
                    properties: {
                        screenShareSessionId: "screen-share-session-1",
                        hasAudio: true,
                    },
                }),
            ],
        });
        expect(sendAdmin).toHaveBeenCalledWith({
            events: [
                expect.objectContaining({
                    eventName: "meeting.screenshare.ended",
                    source: "front",
                    properties: {
                        screenShareSessionId: "screen-share-session-1",
                        durationSeconds: 42,
                        hasAudio: true,
                    },
                }),
            ],
        });
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

        // Query string + hash must be stripped to avoid leaking auth tokens to analytics.
        expect(sendAdmin).toHaveBeenCalledWith({
            events: [
                expect.objectContaining({
                    eventName: "cowebsite.opened",
                    source: "front",
                    properties: {
                        url: "https://example.com/secured/file.pdf",
                        targetUrl: "https://example.com/files/file.pdf",
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
                        targetUrl: "https://example.com/workadventure",
                        mediaKind: "website",
                        triggerProperty: "other",
                    }),
                }),
            ],
        });
    });
});
