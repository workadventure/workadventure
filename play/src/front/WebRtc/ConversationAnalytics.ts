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
};

type ConversationType = "spontaneous_bubble" | "meeting" | "remote";

export function subscribeToConversationAnalytics(
    inConversationStore: Readable<boolean>,
    sendReport: (message: AnalyticsEventReportMessage) => void,
    sendIntervalMs = CONVERSATION_ANALYTICS_SEND_INTERVAL_MS,
    options: ConversationAnalyticsOptions = {}
): Unsubscriber {
    if (hasCapability(ANALYTICS_EVENTS_CAPABILITY) !== "v1") {
        return () => {};
    }

    let inConversation = false;
    let inMeeting = false;
    let meetingProvider: MeetingProvider | undefined = options.meetingProvider;
    let conversationGroupId: number | string | undefined;
    let conversationId: string | undefined;
    let conversationType: ConversationType = "remote";
    const sendConversationEvent = (
        eventName: "conversation.started" | "conversation.ended" | "meeting.provider_changed",
        currentConversationId: string,
        currentConversationType: ConversationType,
        extraProperties: Record<string, string | number | boolean | null | undefined> = {}
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
        nextConversationType = conversationTypeFromState(inMeeting, conversationGroupId)
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
                    eventId: `conversation-heartbeat:${currentConversationId}:${now}`,
                    properties: {
                        schemaVersion: 1,
                        conversationId: currentConversationId,
                        meetingSessionId: currentConversationType === "meeting" ? currentConversationId : undefined,
                        conversationType: currentConversationType,
                        meetingProvider: currentMeetingProvider,
                        participantCount: 2,
                        sampleDurationSeconds: Math.round(sendIntervalMs / 1000),
                    },
                },
            ],
        });
    }, sendIntervalMs);

    return () => {
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
    meetingProvider?: MeetingProvider
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
    groupId: number | string | undefined
): string | undefined {
    if (conversationType !== "spontaneous_bubble") {
        return undefined;
    }

    if (groupId === undefined || groupId === "") {
        return undefined;
    }

    return `group:${groupId}`;
}
