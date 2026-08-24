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

        analyticsClient.trackAdminEvent("bubble.say.opened");

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

        analyticsClient.trackAdminEvent("map_editor.property.added", { name: "openWebsite", type: "area" });

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

        analyticsClient.trackAdminEvent("bubble.lock.toggled");
        analyticsClient.trackAdminEvent("chat.message_sent", { chatContext: "room" });

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

        analyticsClient.trackAdminEvent("bubble.say.opened");
        analyticsClient.trackAdminEvent("bubble.think.opened");

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

    it("gives each meeting its own handle, so closing one leaves the others open", () => {
        const sendAdmin = vi.fn();
        analyticsClient.setAdminAnalyticsSender(sendAdmin);
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };

        // SpaceRegistry keeps several spaces live at once. This used to be a single
        // global provider store, so leaving one space ended the meeting of every
        // other one — the handle is per-caller precisely to make that impossible.
        const endFirst = analyticsClient.openTimedEvent("meeting.ended", {
            meetingProvider: "webrtc",
            meetingId: "space-a",
        });
        const endSecond = analyticsClient.openTimedEvent("meeting.ended", {
            meetingProvider: "livekit",
            meetingId: "space-b",
        });
        endFirst();

        const events = sendAdmin.mock.calls.flatMap(([message]) => message.events);
        const opens = events.filter((event) => event.eventName === "timed_event.open");
        const closes = events.filter((event) => event.eventName === "timed_event.close");

        expect(opens.map((event) => event.properties.properties.meetingId)).toEqual(["space-a", "space-b"]);
        expect(closes).toHaveLength(1);
        expect(closes[0].properties.handle).toBe(opens[0].properties.handle);

        endSecond();
        expect(
            sendAdmin.mock.calls
                .flatMap(([message]) => message.events)
                .filter((event) => event.eventName === "timed_event.close"),
        ).toHaveLength(2);
    });

    // The PostHog name now comes off the catalog rather than a second call at the
    // call site, which puts every capture behind trackAdminEvent. These pin the two
    // ways that fold could quietly change what PostHog receives.
    it("captures to PostHog even without the admin analytics capability", () => {
        const capture = vi.fn();
        window.capabilities = {};
        window.posthog = { capture } as never;

        analyticsClient.trackAdminEvent("bubble.say.opened");

        // PostHog predates this pipeline and is the only sink on a world whose pusher
        // does not advertise the capability. Folding it behind the gate would switch
        // analytics off for all of them.
        expect(capture).toHaveBeenCalledWith("wa_say_bubble_open", {});
    });

    it("leaves PostHog alone for events it never knew", () => {
        const sendAdmin = vi.fn();
        const capture = vi.fn();
        analyticsClient.setAdminAnalyticsSender(sendAdmin);
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };
        window.posthog = { capture } as never;

        // Added with the new pipeline: no postHogKey in the catalog, so reporting it
        // must not invent PostHog volume that never existed.
        analyticsClient.trackAdminEvent("chat.message_sent", { chatContext: "proximity" });

        expect(capture).not.toHaveBeenCalled();
        expect(sendAdmin).toHaveBeenCalledWith({
            events: [expect.objectContaining({ eventName: "chat.message_sent" })],
        });
    });

    it("keeps the two PostHog names of an event two UI paths reach", () => {
        const sendAdmin = vi.fn();
        const capture = vi.fn();
        analyticsClient.setAdminAnalyticsSender(sendAdmin);
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };
        window.posthog = { capture } as never;

        analyticsClient.trackAdminEvent("profile.opened", { source: "menu" });
        analyticsClient.trackAdminEvent("profile.opened", { source: "profile_button" });

        // One event to this pipeline, two to PostHog. The property the call site was
        // already passing is what picks the name, so neither of these two sites — nor
        // any of the other 199 — has to know a PostHog name exists.
        expect(capture).toHaveBeenNthCalledWith(1, "wa_menu_profile", { source: "menu" });
        expect(capture).toHaveBeenNthCalledWith(2, "wa_open_profile_menu", { source: "profile_button" });
        expect(sendAdmin).toHaveBeenCalledTimes(2);
        expect(sendAdmin).toHaveBeenNthCalledWith(1, {
            events: [expect.objectContaining({ eventName: "profile.opened" })],
        });
        expect(sendAdmin).toHaveBeenNthCalledWith(2, {
            events: [expect.objectContaining({ eventName: "profile.opened" })],
        });
    });
});
