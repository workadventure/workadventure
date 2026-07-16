import { beforeEach, describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";
import { subscribeToConversationAnalytics } from "../../../src/front/WebRtc/ConversationAnalytics";

function sentEvents(sendReport: ReturnType<typeof vi.fn>) {
    return sendReport.mock.calls.flatMap(([message]) => message.events);
}

/** The `timed_event.open` frames, in order. Their nested `properties` is the future event's. */
function opened(sendReport: ReturnType<typeof vi.fn>) {
    return sentEvents(sendReport).filter((event) => event.eventName === "timed_event.open");
}

function closed(sendReport: ReturnType<typeof vi.fn>) {
    return sentEvents(sendReport).filter((event) => event.eventName === "timed_event.close");
}

function enableAnalytics() {
    window.capabilities = { "api/analytics/events-batch": "v1" };
}

describe("subscribeToConversationAnalytics", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it("emits nothing without the generic analytics capability", async () => {
        window.capabilities = {};
        const sendReport = vi.fn();
        const inConversation = writable(true);

        subscribeToConversationAnalytics(inConversation, sendReport);
        await vi.advanceTimersByTimeAsync(5_000);

        expect(sendReport).not.toHaveBeenCalled();
    });

    it("opens one timed event when the conversation starts", () => {
        enableAnalytics();
        const sendReport = vi.fn();
        const inConversation = writable(false);

        subscribeToConversationAnalytics(inConversation, sendReport);
        inConversation.set(true);

        expect(opened(sendReport)).toHaveLength(1);
        expect(opened(sendReport)[0].properties).toEqual(
            expect.objectContaining({
                handle: expect.any(String),
                eventName: "conversation.ended",
                properties: expect.objectContaining({
                    conversationId: expect.any(String),
                    conversationType: "remote",
                }),
            })
        );
    });

    it("closes the timed event it opened, on the same handle", () => {
        enableAnalytics();
        const sendReport = vi.fn();
        const inConversation = writable(false);

        subscribeToConversationAnalytics(inConversation, sendReport);
        inConversation.set(true);
        inConversation.set(false);

        expect(closed(sendReport)).toHaveLength(1);
        // A close that does not match an open is dropped by the pusher, so a mismatched
        // handle here would silently lose the whole conversation.
        expect(closed(sendReport)[0].properties.handle).toBe(opened(sendReport)[0].properties.handle);
        expect(closed(sendReport)[0].properties.endReason).toBe("left_conversation");
    });

    /**
     * The security property this whole design exists for.
     *
     * Sampling let a client claim time: an hour of forged collaboration was 60 forged
     * heartbeats. Now the front states *when* things happen and the pusher measures the
     * interval on its own clock, so there is no field a client could lie in. If a
     * duration ever reappears in a front-sent frame, that guarantee is gone — hence an
     * assertion on the absence rather than a comment.
     */
    it("never reports a duration from the client", async () => {
        enableAnalytics();
        const sendReport = vi.fn();
        const inConversation = writable(false);

        subscribeToConversationAnalytics(inConversation, sendReport);
        inConversation.set(true);
        await vi.advanceTimersByTimeAsync(150_000);
        inConversation.set(false);

        const serialized = JSON.stringify(sentEvents(sendReport));
        expect(serialized).not.toContain("durationSeconds");
        expect(serialized).not.toContain("sampleDurationSeconds");
        expect(serialized).not.toContain("startedAt");
        expect(serialized).not.toContain("endedAt");
    });

    /**
     * A conversation shorter than the old sampling cadence used to contribute
     * sampleDurationSeconds: 0 — invisible to every duration metric. One interval per
     * conversation makes the length irrelevant by construction; this pins that.
     */
    it("reports a conversation shorter than a second like any other", async () => {
        enableAnalytics();
        const sendReport = vi.fn();
        const inConversation = writable(false);

        subscribeToConversationAnalytics(inConversation, sendReport);
        inConversation.set(true);
        await vi.advanceTimersByTimeAsync(10);
        inConversation.set(false);

        expect(opened(sendReport)).toHaveLength(1);
        expect(closed(sendReport)).toHaveLength(1);
    });

    it("emits no traffic while the conversation simply lasts", async () => {
        enableAnalytics();
        const sendReport = vi.fn();
        const inConversation = writable(false);

        subscribeToConversationAnalytics(inConversation, sendReport);
        inConversation.set(true);
        // An hour of talking: under sampling this was 720 rows for this user alone.
        await vi.advanceTimersByTimeAsync(3_600_000);

        expect(sentEvents(sendReport)).toHaveLength(1);
    });

    it("does not emit a phantom remote conversation when subscribing to a bubble already in progress", () => {
        enableAnalytics();
        const sendReport = vi.fn();
        // Both stores already carry their value: this is a reconnect into a bubble
        // that is already running, not a fresh join.
        const inConversation = writable(true);
        const conversationGroupId = writable<number | undefined>(42);

        subscribeToConversationAnalytics(inConversation, sendReport, {
            conversationGroupIdStore: conversationGroupId,
        });

        // Subscribing in the wrong order used to open a "remote" conversation with a
        // throwaway uuid, immediately closed as "type_changed" and replaced by the real
        // bubble — inflating conversation counts on every such reconnect.
        expect(opened(sendReport)).toHaveLength(1);
        expect(closed(sendReport)).toHaveLength(0);
        expect(opened(sendReport)[0].properties.properties.conversationType).toBe("spontaneous_bubble");
        expect(opened(sendReport)[0].properties.properties.conversationId).toBe("group:42");
    });

    it("starts a new conversation id after leaving and re-entering a conversation", () => {
        enableAnalytics();
        const sendReport = vi.fn();
        const inConversation = writable(false);

        subscribeToConversationAnalytics(inConversation, sendReport);
        inConversation.set(true);
        inConversation.set(false);
        inConversation.set(true);

        const ids = opened(sendReport).map((event) => event.properties.properties.conversationId);
        expect(ids).toHaveLength(2);
        expect(ids[0]).not.toEqual(ids[1]);
    });

    it("tracks spontaneous bubbles when the server conversation group id is available", () => {
        enableAnalytics();
        const sendReport = vi.fn();
        const inConversation = writable(false);
        const conversationGroupId = writable<number | undefined>(42);

        subscribeToConversationAnalytics(inConversation, sendReport, {
            conversationGroupIdStore: conversationGroupId,
        });
        inConversation.set(true);

        expect(opened(sendReport)[0].properties.properties.conversationId).toEqual("group:42");
        expect(opened(sendReport)[0].properties.properties.conversationType).toEqual("spontaneous_bubble");
    });

    it("tracks meetings when the meeting store is active", () => {
        enableAnalytics();
        const sendReport = vi.fn();
        const inConversation = writable(false);
        const inMeeting = writable(false);
        const conversationGroupId = writable<number | undefined>(42);

        subscribeToConversationAnalytics(inConversation, sendReport, {
            conversationGroupIdStore: conversationGroupId,
            meetingStore: inMeeting,
        });
        inConversation.set(true);
        inMeeting.set(true);

        const meeting = opened(sendReport).at(-1);
        expect(meeting?.properties.properties.conversationType).toEqual("meeting");
        expect(meeting?.properties.properties.conversationId).not.toEqual("group:42");
        expect(meeting?.properties.properties.meetingSessionId).toEqual(meeting?.properties.properties.conversationId);
    });

    /**
     * bubble -> meeting -> bubble, and the reason this test exists.
     *
     * The removed sampling interval re-derived the conversation from the stores on
     * every tick and treated a drifted id as a fresh conversation. That could have been
     * load-bearing — a reconciliation the store subscriptions relied on without saying
     * so — or dead weight. Only a run without the interval settles it: the transitions
     * are driven by the stores alone here, and each leg must still be its own closed
     * interval with its own id.
     */
    it("reports a bubble that becomes a meeting and comes back as three distinct intervals", () => {
        enableAnalytics();
        const sendReport = vi.fn();
        const inConversation = writable(false);
        const inMeeting = writable(false);
        const conversationGroupId = writable<number | undefined>(42);

        subscribeToConversationAnalytics(inConversation, sendReport, {
            conversationGroupIdStore: conversationGroupId,
            meetingStore: inMeeting,
        });
        inConversation.set(true);
        inMeeting.set(true);
        inMeeting.set(false);
        inConversation.set(false);

        const types = opened(sendReport).map((event) => event.properties.properties.conversationType);
        const ids = opened(sendReport).map((event) => event.properties.properties.conversationId);
        const handles = opened(sendReport).map((event) => event.properties.handle);

        expect(types).toEqual(["spontaneous_bubble", "meeting", "spontaneous_bubble"]);
        // Every leg closes: an interval left open would be closed by the pusher at
        // socket death and dated to the disconnect, not to the transition.
        expect(closed(sendReport).map((event) => event.properties.handle)).toEqual(handles);
        expect(closed(sendReport).map((event) => event.properties.endReason)).toEqual([
            "type_changed",
            "type_changed",
            "left_conversation",
        ]);
        // The two bubble legs share the group id — they are the same bubble, resumed.
        expect(ids[0]).toBe("group:42");
        expect(ids[2]).toBe("group:42");
        expect(ids[1]).not.toBe("group:42");
        // ...but they are distinct intervals, so their handles must not collide.
        expect(new Set(handles).size).toBe(3);
    });

    it("closes the open conversation on cleanup", () => {
        enableAnalytics();
        const sendReport = vi.fn();
        const inConversation = writable(false);

        const unsubscribe = subscribeToConversationAnalytics(inConversation, sendReport);
        inConversation.set(true);
        unsubscribe();

        expect(closed(sendReport)).toHaveLength(1);
        expect(closed(sendReport)[0].properties.endReason).toBe("cleanup");
    });

    it("emits meeting provider changes while a meeting stays active", () => {
        enableAnalytics();
        const sendReport = vi.fn();
        const inConversation = writable(false);
        const meetingProvider = writable<"livekit" | "jitsi" | "webrtc" | undefined>("livekit");

        subscribeToConversationAnalytics(inConversation, sendReport, {
            meetingProviderStore: meetingProvider,
        });
        inConversation.set(true);
        meetingProvider.set("jitsi");

        const providerChangedEvent = sentEvents(sendReport).find(
            (event) => event.eventName === "meeting.provider_changed"
        );

        expect(providerChangedEvent?.properties.previousMeetingProvider).toEqual("livekit");
        expect(providerChangedEvent?.properties.meetingProvider).toEqual("jitsi");
    });
});
