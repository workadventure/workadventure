import { beforeEach, describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";
import { subscribeToConversationAnalytics } from "../../../src/front/WebRtc/ConversationAnalytics";

function sentEvents(sendReport: ReturnType<typeof vi.fn>) {
    return sendReport.mock.calls.flatMap(([message]) => message.events);
}

describe("subscribeToConversationAnalytics", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it("does not emit heartbeats without the generic analytics capability", async () => {
        window.capabilities = {};
        const sendReport = vi.fn();
        const inConversation = writable(true);

        subscribeToConversationAnalytics(inConversation, sendReport);
        await vi.advanceTimersByTimeAsync(5_000);

        expect(sendReport).not.toHaveBeenCalled();
    });

    it("emits conversation heartbeats while the user is in a conversation", async () => {
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };
        const sendReport = vi.fn();
        const inConversation = writable(false);

        subscribeToConversationAnalytics(inConversation, sendReport, 5_000);
        inConversation.set(true);
        await vi.advanceTimersByTimeAsync(5_000);

        expect(sendReport).toHaveBeenCalledWith({
            events: [
                expect.objectContaining({
                    eventName: "conversation.heartbeat",
                    source: "front",
                    eventId: expect.stringContaining("conversation-heartbeat"),
                    properties: expect.objectContaining({
                        conversationId: expect.any(String),
                        conversationType: "remote",
                        // Time actually elapsed since the previous sample, not a fixed
                        // slice of the cadence.
                        sampleDurationSeconds: 5,
                    }),
                }),
            ],
        });
    });

    it("uses unique heartbeat eventIds across ticks sharing a millisecond", async () => {
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };
        const sendReport = vi.fn();
        const inConversation = writable(true);

        subscribeToConversationAnalytics(inConversation, sendReport);
        await vi.advanceTimersByTimeAsync(15_000);

        const heartbeats = sentEvents(sendReport).filter((event) => event.eventName === "conversation.heartbeat");
        const eventIds = heartbeats.map((event) => event.eventId);
        expect(new Set(eventIds).size).toBe(eventIds.length);
    });

    it("counts a conversation shorter than one interval instead of dropping it", async () => {
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };
        const sendReport = vi.fn();
        const inConversation = writable(false);

        // The first tick only fires after a full interval, so before the closing
        // sample existed a conversation shorter than the cadence contributed
        // sampleDurationSeconds: 0 — it was invisible to every duration metric.
        subscribeToConversationAnalytics(inConversation, sendReport, 60_000);
        inConversation.set(true);
        await vi.advanceTimersByTimeAsync(4_000);
        inConversation.set(false);

        const heartbeats = sentEvents(sendReport).filter((event) => event.eventName === "conversation.heartbeat");
        const total = heartbeats.reduce((sum, event) => sum + Number(event.properties.sampleDurationSeconds ?? 0), 0);
        expect(total).toBe(4);
    });

    it("makes the summed samples match the interval carried by conversation.ended", async () => {
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };
        const sendReport = vi.fn();
        const inConversation = writable(false);

        // A conversation spanning several ticks plus a partial remainder: the two
        // duration primitives must agree, which is what lets the admin migrate from
        // summing samples to reading durationSeconds.
        subscribeToConversationAnalytics(inConversation, sendReport, 60_000);
        inConversation.set(true);
        await vi.advanceTimersByTimeAsync(150_000);
        inConversation.set(false);

        const events = sentEvents(sendReport);
        const summed = events
            .filter((event) => event.eventName === "conversation.heartbeat")
            .reduce((sum, event) => sum + Number(event.properties.sampleDurationSeconds ?? 0), 0);
        const ended = events.find((event) => event.eventName === "conversation.ended");

        expect(summed).toBe(150);
        expect(ended?.properties.durationSeconds).toBe(150);
        expect(ended?.properties.startedAt).toEqual(expect.any(String));
        expect(ended?.properties.endedAt).toEqual(expect.any(String));
    });

    it("keeps the same conversation id while the conversation stays active", async () => {
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };
        const sendReport = vi.fn();
        const inConversation = writable(false);

        subscribeToConversationAnalytics(inConversation, sendReport, 5_000);
        inConversation.set(true);
        await vi.advanceTimersByTimeAsync(10_000);

        const heartbeatEvents = sentEvents(sendReport).filter((event) => event.eventName === "conversation.heartbeat");
        const firstConversationId = heartbeatEvents[0].properties.conversationId;
        const secondConversationId = heartbeatEvents[1].properties.conversationId;

        expect(firstConversationId).toEqual(secondConversationId);
    });

    it("starts a new conversation id after leaving and re-entering a conversation", async () => {
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };
        const sendReport = vi.fn();
        const inConversation = writable(false);

        subscribeToConversationAnalytics(inConversation, sendReport, 5_000);
        inConversation.set(true);
        await vi.advanceTimersByTimeAsync(5_000);
        inConversation.set(false);
        await vi.advanceTimersByTimeAsync(5_000);
        inConversation.set(true);
        await vi.advanceTimersByTimeAsync(5_000);

        const heartbeatEvents = sentEvents(sendReport).filter((event) => event.eventName === "conversation.heartbeat");
        const firstConversationId = heartbeatEvents[0].properties.conversationId;
        const secondConversationId = heartbeatEvents[1].properties.conversationId;

        expect(firstConversationId).not.toEqual(secondConversationId);
    });

    it("tracks spontaneous bubbles when the server conversation group id is available", async () => {
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };
        const sendReport = vi.fn();
        const inConversation = writable(false);
        const conversationGroupId = writable<number | undefined>(42);

        subscribeToConversationAnalytics(inConversation, sendReport, 5_000, {
            conversationGroupIdStore: conversationGroupId,
        });
        inConversation.set(true);
        await vi.advanceTimersByTimeAsync(5_000);

        const heartbeatEvent = sentEvents(sendReport).find((event) => event.eventName === "conversation.heartbeat");

        expect(heartbeatEvent?.properties.conversationId).toEqual("group:42");
        expect(heartbeatEvent?.properties.conversationType).toEqual("spontaneous_bubble");
    });

    it("tracks meetings when the meeting store is active", async () => {
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };
        const sendReport = vi.fn();
        const inConversation = writable(false);
        const inMeeting = writable(false);
        const conversationGroupId = writable<number | undefined>(42);

        subscribeToConversationAnalytics(inConversation, sendReport, 5_000, {
            conversationGroupIdStore: conversationGroupId,
            meetingStore: inMeeting,
        });
        inConversation.set(true);
        inMeeting.set(true);
        await vi.advanceTimersByTimeAsync(5_000);

        const heartbeatEvent = sentEvents(sendReport).find((event) => event.eventName === "conversation.heartbeat");

        expect(heartbeatEvent?.properties.conversationType).toEqual("meeting");
        expect(heartbeatEvent?.properties.conversationId).not.toEqual("group:42");
        expect(heartbeatEvent?.properties.meetingSessionId).toEqual(heartbeatEvent?.properties.conversationId);
    });

    it("emits conversation lifecycle events", () => {
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };
        const sendReport = vi.fn();
        const inConversation = writable(false);

        subscribeToConversationAnalytics(inConversation, sendReport);
        inConversation.set(true);
        inConversation.set(false);

        expect(sentEvents(sendReport).map((event) => event.eventName)).toEqual([
            "conversation.started",
            "conversation.ended",
        ]);
    });

    it("emits meeting provider changes while a meeting stays active", () => {
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };
        const sendReport = vi.fn();
        const inConversation = writable(false);
        const meetingProvider = writable<"livekit" | "jitsi" | "webrtc" | undefined>("livekit");

        subscribeToConversationAnalytics(inConversation, sendReport, 5_000, {
            meetingProviderStore: meetingProvider,
        });
        inConversation.set(true);
        meetingProvider.set("jitsi");

        const providerChangedEvent = sentEvents(sendReport).find(
            (event) => event.eventName === "meeting.provider_changed",
        );

        expect(providerChangedEvent?.properties.previousMeetingProvider).toEqual("livekit");
        expect(providerChangedEvent?.properties.meetingProvider).toEqual("jitsi");
    });
});
