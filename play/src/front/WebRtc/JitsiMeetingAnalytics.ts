import { analyticsClient } from "../Administration/AnalyticsClient";
import type { EndTimedAnalyticsEvent } from "../Administration/TimedAnalyticsEvent";

/**
 * The Jitsi meeting currently open, if any.
 *
 * A module-level single value rather than a map, because `inJitsiStore` is one
 * too: the app tracks being in Jitsi as a single global boolean, so there is at
 * most one Jitsi meeting at a time. Both property listeners drive that store and
 * both drive this, which is what keeps the two from disagreeing.
 */
let endMeeting: EndTimedAnalyticsEvent | undefined;

export function jitsiMeetingStarted(roomName: string): void {
    // A live handle here means the matching leave never ran, so this interval's
    // end is the arrival of the next meeting rather than a real departure.
    jitsiMeetingEnded();
    endMeeting = analyticsClient.openTimedEvent("meeting.ended", { meetingProvider: "jitsi", meetingId: roomName });
}

export function jitsiMeetingEnded(): void {
    endMeeting?.();
    endMeeting = undefined;
}
