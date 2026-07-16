import type { Readable, Unsubscriber } from "svelte/store";
import type { AnalyticsEventReportMessage } from "@workadventure/messages";
import { v4 as uuidv4 } from "uuid";
import { hasCapability } from "../Connection/Capabilities";
import type { TimedAnalyticsEventHandle } from "../Administration/TimedAnalyticsEvent";
import { openTimedAnalyticsEvent } from "../Administration/TimedAnalyticsEvent";

const ANALYTICS_EVENTS_CAPABILITY = "api/analytics/events-batch";

export type MeetingProvider = "livekit" | "jitsi" | "webrtc";

type ConversationAnalyticsOptions = {
    conversationGroupIdStore?: Readable<number | string | undefined>;
    meetingStore?: Readable<boolean>;
    meetingProvider?: MeetingProvider;
    meetingProviderStore?: Readable<MeetingProvider | undefined>;
};

type ConversationType = "spontaneous_bubble" | "meeting" | "remote";

/**
 * Reports the local user's conversations as timed events.
 *
 * One row per conversation, emitted by the pusher when it closes. This used to be a
 * sample every few seconds — 720 rows per conversing user-hour, against a pusher
 * that flushes ~100 events/s, so one instance saturated around 500 concurrent
 * conversing users. The front now reports only *when* a conversation opens and
 * stops; it never reports a duration, so a client cannot claim one.
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
    /** The open conversation's handle, and the only way to close it. */
    let openConversation: TimedAnalyticsEventHandle | undefined;

    // Only meeting.provider_changed remains a plain point-in-time event: the
    // conversation's own lifecycle is carried by the timed-event handle below.
    const sendConversationEvent = (
        eventName: "meeting.provider_changed",
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
        openConversation = openTimedAnalyticsEvent(
            "conversation.ended",
            {
                schemaVersion: 1,
                conversationId,
                meetingSessionId: conversationType === "meeting" ? conversationId : undefined,
                conversationType,
                meetingProvider: meetingProviderFromConversationType(conversationType, meetingProvider),
            },
            sendReport,
        );
    };
    const endConversation = (endReason?: string): void => {
        // Asking to close is all the front does: the pusher times the interval on its
        // own clock and emits the single row. If this never runs — tab closed, network
        // dropped — the pusher closes it from the socket lifecycle instead.
        openConversation?.close(endReason);
        openConversation = undefined;
        conversationId = undefined;
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
    // Order matters. Svelte fires a subscriber immediately with the current value,
    // so the stores describing *what kind* of conversation this is must be read
    // before the one that opens it. Subscribing to inConversationStore first meant
    // that reconnecting into a bubble already in progress opened a "remote"
    // conversation with a throwaway uuid — because conversationGroupId was still
    // undefined — and closed it again as "type_changed" one line later, inflating
    // conversation counts by one phantom per reconnect.
    //
    // These three are safe to run first: transitionConversationType only updates
    // local state while inConversation is false, and emits nothing.
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

    // Last, now that conversationGroupId / inMeeting / meetingProvider are known:
    // this is the subscription that actually opens a conversation.
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

    return () => {
        // Registered through connection.onCleanup(): RoomConnection.closeConnection()
        // runs the cleanups while the socket is still OPEN, which is the only reason
        // this last conversation.ended reaches the pusher — send() silently drops
        // frames once the socket is manually closed. Remote or abnormal closes never
        // run this at all; AnalyticsPresenceTracker covers those server-side.
        endConversation("cleanup");
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
