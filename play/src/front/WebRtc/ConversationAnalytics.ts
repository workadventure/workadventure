import type { Readable, Unsubscriber } from "svelte/store";
import type { AnalyticsEventReportMessage } from "@workadventure/messages";
import { v4 as uuidv4 } from "uuid";
import { hasCapability } from "../Connection/Capabilities";

const ANALYTICS_EVENTS_CAPABILITY = "api/analytics/events-batch";

/**
 * How often an open conversation checkpoints itself.
 *
 * This is a durability knob, not an accuracy one. Each heartbeat now reports the
 * time actually elapsed since the previous one, and closing a conversation emits
 * the exact remainder, so `sum(sampleDurationSeconds)` equals the real duration
 * whatever the cadence — which is why this can be 60s rather than the 5s it used
 * to need. It only bounds what is lost when a tab dies mid-conversation and no
 * close is ever emitted: at most one interval.
 *
 * At 5s each conversing user cost 720 events/hour, and the pusher flushes at
 * most ~100 events/s, so a single instance saturated at roughly 500 concurrent
 * conversing users. 60s divides that by twelve.
 */
const CONVERSATION_ANALYTICS_SEND_INTERVAL_MS = 60_000;

export type MeetingProvider = "livekit" | "jitsi" | "webrtc";

type ConversationAnalyticsOptions = {
    conversationGroupIdStore?: Readable<number | string | undefined>;
    meetingStore?: Readable<boolean>;
    meetingProvider?: MeetingProvider;
    meetingProviderStore?: Readable<MeetingProvider | undefined>;
};

type ConversationType = "spontaneous_bubble" | "meeting" | "remote";

/**
 * Reports the local user's conversation lifecycle (started / heartbeat / ended).
 *
 * How well a conversation correlates across participants depends on its type,
 * and anything querying these events has to account for it:
 * - a spontaneous bubble is keyed on the server-assigned group id (`group:<id>`),
 *   so every participant reports the *same* conversationId and both sides of a
 *   bubble can be joined;
 * - meetings and remote conversations have no shared handle here, so each client
 *   falls back to a locally generated uuid. Two participants in one meeting
 *   report *different* conversationIds (and meetingSessionIds) — they can only
 *   be correlated on room and time, never by id.
 */
export function subscribeToConversationAnalytics(
    inConversationStore: Readable<boolean>,
    sendReport: (message: AnalyticsEventReportMessage) => void,
    sendIntervalMs = CONVERSATION_ANALYTICS_SEND_INTERVAL_MS,
    options: ConversationAnalyticsOptions = {},
): Unsubscriber {
    // Capability is resolved once, at subscribe time: a world whose admin does
    // not advertise the endpoint emits nothing at all rather than queueing
    // events that would be dropped further down the pipeline.
    if (hasCapability(ANALYTICS_EVENTS_CAPABILITY) !== "v1") {
        return () => {};
    }

    let inConversation = false;
    let inMeeting = false;
    let meetingProvider: MeetingProvider | undefined = options.meetingProvider;
    let conversationGroupId: number | string | undefined;
    let conversationId: string | undefined;
    let conversationType: ConversationType = "remote";
    /** Start of the open conversation, and the instant its last sample covered up to. */
    let startedAtMs: number | undefined;
    let lastSampleAtMs: number | undefined;

    /**
     * Reports the time elapsed since the previous sample, rather than a fixed
     * slice of the cadence.
     *
     * The old code sent `sendIntervalMs / 1000` on every tick, which made the
     * total systematically short by up to one interval: the first tick only fires
     * after one full interval, so a 12s conversation reported 10s and a 4s one
     * reported nothing at all. Measuring the real gap, plus a closing sample for
     * the remainder, makes the sum exact and independent of the cadence.
     */
    const sendHeartbeat = (
        untilMs: number,
        currentConversationId: string,
        currentConversationType: ConversationType,
    ) => {
        if (lastSampleAtMs === undefined) {
            return;
        }

        const sampleDurationSeconds = (untilMs - lastSampleAtMs) / 1000;
        if (sampleDurationSeconds <= 0) {
            return;
        }
        lastSampleAtMs = untilMs;

        sendReport({
            events: [
                {
                    eventName: "conversation.heartbeat",
                    source: "front",
                    clientEventTimeMs: untilMs,
                    // uuid suffix so two heartbeats sharing a millisecond don't collide
                    // (the backend dedupes by eventId).
                    eventId: `conversation-heartbeat:${currentConversationId}:${uuidv4()}`,
                    properties: {
                        schemaVersion: 1,
                        conversationId: currentConversationId,
                        meetingSessionId: currentConversationType === "meeting" ? currentConversationId : undefined,
                        conversationType: currentConversationType,
                        meetingProvider: meetingProviderFromConversationType(currentConversationType, meetingProvider),
                        sampleDurationSeconds,
                    },
                },
            ],
        });
    };
    const sendConversationEvent = (
        eventName: "conversation.started" | "conversation.ended" | "meeting.provider_changed",
        currentConversationId: string,
        currentConversationType: ConversationType,
        extraProperties: Record<string, string | number | boolean | null | undefined> = {},
    ): void => {
        const now = Date.now();
        const currentMeetingProvider = meetingProviderFromConversationType(currentConversationType, meetingProvider);

        sendReport({
            events: [
                {
                    eventName,
                    source: "front",
                    clientEventTimeMs: now,
                    eventId: `${eventName}:${currentConversationId}:${now}`,
                    properties: {
                        schemaVersion: 1,
                        conversationId: currentConversationId,
                        meetingSessionId: currentConversationType === "meeting" ? currentConversationId : undefined,
                        conversationType: currentConversationType,
                        meetingProvider: currentMeetingProvider,
                        ...extraProperties,
                    },
                },
            ],
        });
    };
    const startConversation = (
        nextConversationType = conversationTypeFromState(inMeeting, conversationGroupId),
    ): void => {
        conversationType = nextConversationType;
        conversationId = conversationIdFromState(conversationType, conversationGroupId) ?? uuidv4();
        startedAtMs = Date.now();
        lastSampleAtMs = startedAtMs;
        sendConversationEvent("conversation.started", conversationId, conversationType);
    };
    const endConversation = (reason?: string): void => {
        if (!conversationId) {
            return;
        }

        const endedAtMs = Date.now();
        // Close the sampling first: this last heartbeat carries the remainder since
        // the previous one, which is what makes sum(sampleDurationSeconds) exact.
        sendHeartbeat(endedAtMs, conversationId, conversationType);

        // conversation.ended now carries the interval as a scalar, the same shape
        // meeting.screenshare.ended and user.disconnected already use, so a consumer
        // can read the duration straight off this event instead of summing samples.
        // Both are emitted for now: the heartbeats remain the durable record while
        // the admin queries still derive duration from them.
        sendConversationEvent("conversation.ended", conversationId, conversationType, {
            reason,
            startedAt: startedAtMs !== undefined ? new Date(startedAtMs).toISOString() : undefined,
            endedAt: new Date(endedAtMs).toISOString(),
            durationSeconds: startedAtMs !== undefined ? (endedAtMs - startedAtMs) / 1000 : undefined,
        });
        conversationId = undefined;
        startedAtMs = undefined;
        lastSampleAtMs = undefined;
    };
    // Changing type mid-conversation is reported as ended("type_changed") followed
    // by a fresh started, so a single uninterrupted conversation from the user's
    // point of view can span several conversationIds (e.g. a bubble that turns
    // into a meeting). Consumers must stitch those on time rather than assume one
    // id per conversation.
    const transitionConversationType = (nextConversationType: ConversationType): void => {
        if (!inConversation) {
            conversationType = nextConversationType;
            conversationId = undefined;
            return;
        }

        if (nextConversationType === conversationType) {
            conversationId = conversationId ?? conversationIdFromState(nextConversationType, conversationGroupId);
            return;
        }

        endConversation("type_changed");
        startConversation(nextConversationType);
    };
    const unsubscribe = inConversationStore.subscribe((value) => {
        if (value && !inConversation) {
            inConversation = value;
            startConversation();
            return;
        } else if (!value && inConversation) {
            endConversation("left_conversation");
        }
        inConversation = value;
    });
    const unsubscribeGroupId = options.conversationGroupIdStore?.subscribe((value) => {
        conversationGroupId = value;
        transitionConversationType(conversationTypeFromState(inMeeting, value));
    });
    const unsubscribeMeeting = options.meetingStore?.subscribe((value) => {
        inMeeting = value;
        transitionConversationType(conversationTypeFromState(value, conversationGroupId));
    });
    const unsubscribeMeetingProvider = options.meetingProviderStore?.subscribe((value) => {
        const previousMeetingProvider = meetingProvider;
        meetingProvider = value ?? options.meetingProvider;
        // ConnectionManager passes meetingProviderStore but no meetingStore, so in
        // practice "in a meeting" *is* "a meeting provider is active". The second
        // operand only matters for callers that supply an explicit meetingStore
        // (the tests), where it keeps that store authoritative.
        const nextInMeeting = value !== undefined || Boolean(options.meetingStore && inMeeting);
        if (nextInMeeting !== inMeeting) {
            inMeeting = nextInMeeting;
            transitionConversationType(conversationTypeFromState(nextInMeeting, conversationGroupId));
        }

        if (
            inConversation &&
            conversationId &&
            conversationType === "meeting" &&
            previousMeetingProvider &&
            meetingProvider &&
            previousMeetingProvider !== meetingProvider
        ) {
            sendConversationEvent("meeting.provider_changed", conversationId, conversationType, {
                previousMeetingProvider,
                meetingProvider,
            });
        }
    });

    const interval = setInterval(() => {
        if (!inConversation) {
            return;
        }

        const now = Date.now();
        const currentConversationType = conversationTypeFromState(inMeeting, conversationGroupId);
        if (currentConversationType !== conversationType) {
            conversationId = undefined;
            conversationType = currentConversationType;
        }

        const currentConversationId =
            conversationId ?? conversationIdFromState(currentConversationType, conversationGroupId) ?? uuidv4();
        if (conversationId !== currentConversationId) {
            // The interval re-derived the conversation from drifted state: treat it as
            // a fresh one rather than back-dating the sample to a conversation that no
            // longer exists.
            conversationId = currentConversationId;
            startedAtMs = startedAtMs ?? now;
            lastSampleAtMs = now;
            return;
        }

        sendHeartbeat(now, currentConversationId, currentConversationType);
    }, sendIntervalMs);

    return () => {
        // Registered through connection.onCleanup(): RoomConnection.closeConnection()
        // runs the cleanups while the socket is still OPEN, which is the only reason
        // this last conversation.ended reaches the pusher — send() silently drops
        // frames once the socket is manually closed. Remote or abnormal closes never
        // run this at all; AnalyticsPresenceTracker covers those server-side.
        endConversation("cleanup");
        clearInterval(interval);
        unsubscribe();
        unsubscribeGroupId?.();
        unsubscribeMeeting?.();
        unsubscribeMeetingProvider?.();
    };
}

function conversationTypeFromState(inMeeting: boolean, groupId: number | string | undefined): ConversationType {
    if (inMeeting) {
        return "meeting";
    }

    if (groupId !== undefined && groupId !== "") {
        return "spontaneous_bubble";
    }

    return "remote";
}

function meetingProviderFromConversationType(
    conversationType: ConversationType,
    meetingProvider?: MeetingProvider,
): MeetingProvider | undefined {
    if (conversationType === "meeting") {
        return meetingProvider ?? "livekit";
    }

    if (conversationType === "spontaneous_bubble") {
        return "webrtc";
    }

    return undefined;
}

function conversationIdFromState(
    conversationType: ConversationType,
    groupId: number | string | undefined,
): string | undefined {
    if (conversationType !== "spontaneous_bubble") {
        return undefined;
    }

    if (groupId === undefined || groupId === "") {
        return undefined;
    }

    return `group:${groupId}`;
}
