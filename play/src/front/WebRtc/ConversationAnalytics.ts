import type { Readable, Unsubscriber } from "svelte/store";
import type { AnalyticsEventReportMessage } from "@workadventure/messages";
import { v4 as uuidv4 } from "uuid";
import { hasCapability } from "../Connection/Capabilities";

const ANALYTICS_EVENTS_CAPABILITY = "api/analytics/events-batch";
const CONVERSATION_ANALYTICS_SEND_INTERVAL_MS = 5_000;

export type MeetingProvider = "livekit" | "jitsi" | "webrtc";

type ConversationAnalyticsOptions = {
    conversationGroupIdStore?: Readable<number | string | undefined>;
    meetingStore?: Readable<boolean>;
    meetingProvider?: MeetingProvider;
    meetingProviderStore?: Readable<MeetingProvider | undefined>;
    participantCountStore?: Readable<number | undefined>;
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
    let participantCount: number | undefined;
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
        sendConversationEvent("conversation.started", conversationId, conversationType);
    };
    const endConversation = (reason?: string): void => {
        if (!conversationId) {
            return;
        }

        sendConversationEvent("conversation.ended", conversationId, conversationType, { reason });
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
    const unsubscribeParticipantCount = options.participantCountStore?.subscribe((value) => {
        participantCount = typeof value === "number" && value >= 0 ? value : undefined;
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
        conversationId = currentConversationId;
        const currentMeetingProvider = meetingProviderFromConversationType(currentConversationType, meetingProvider);

        sendReport({
            events: [
                {
                    eventName: "conversation.heartbeat",
                    source: "front",
                    clientEventTimeMs: now,
                    // uuid suffix so two heartbeats sharing a millisecond don't collide
                    // (the backend dedupes by eventId).
                    eventId: `conversation-heartbeat:${currentConversationId}:${uuidv4()}`,
                    properties: {
                        schemaVersion: 1,
                        conversationId: currentConversationId,
                        meetingSessionId: currentConversationType === "meeting" ? currentConversationId : undefined,
                        conversationType: currentConversationType,
                        meetingProvider: currentMeetingProvider,
                        participantCount,
                        sampleDurationSeconds: Math.round(sendIntervalMs / 1000),
                    },
                },
            ],
        });
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
        unsubscribeParticipantCount?.();
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
