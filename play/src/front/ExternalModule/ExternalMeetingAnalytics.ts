import { analyticsClient } from "../Administration/AnalyticsClient";
import { meetingEnded, meetingStarted } from "../Administration/CurrentMeeting";
import type { EndTimedAnalyticsEvent } from "../Administration/TimedAnalyticsEvent";

/**
 * Meetings held somewhere else: an area an extension opens in another application.
 *
 * Reported by the client, like Jitsi and for the same reason — the back cannot see
 * them. These areas do rendezvous their participants in a WorkAdventure space, but it
 * syncs no media, and the meeting itself happens in another tab or in the desktop app.
 *
 * So what is measured here is **time spent in the area**, not time spent in the call.
 * Nobody observes that tab: a user who walks away with the call still open leaves our
 * numbers, and one who stands in the area without ever joining enters them. The event
 * says so, and `meetingKind: "external"` is what keeps these rows from being read
 * beside real meeting time without noticing.
 *
 * Which extensions exist is not this module's business: whatever subtype the module
 * declares is carried through as the provider name.
 */

/** One live meeting per module subtype: you cannot be in two such areas at once. */
const liveMeetingBySubtype = new Map<string, { end: EndTimedAnalyticsEvent; areaId: string }>();

export function externalMeetingStarted(subtype: string, areaId: string, roomId: string): void {
    // A live handle here means the matching leave never ran, so this interval's end is
    // the arrival of the next meeting rather than a real departure.
    externalMeetingEnded(subtype);

    // The module's own subtype is the provider name, passed through rather than mapped
    // against a list of the ones we happen to know: which extensions exist is not this
    // side's business, and a list here would silently stop measuring the next one.
    // The area id, not the module's space name: it is the one identifier this side
    // knows, and it is stable for as long as the area exists.
    analyticsClient.trackAdminEvent("meeting.area_entered", {
        roomId,
        meetingProvider: "external",
        externalMeetingProviderName: subtype,
    });
    liveMeetingBySubtype.set(subtype, {
        end: analyticsClient.openTimedEvent("meeting.ended", {
            meetingProvider: "external",
            externalMeetingProviderName: subtype,
            meetingKind: "external",
            meetingId: areaId,
        }),
        areaId,
    });
    // So the periods this client reports for itself — its microphone, its speaking —
    // say which meeting they happened in, exactly as they do for a bubble.
    meetingStarted(areaId);
}

export function externalMeetingEnded(subtype: string): void {
    const live = liveMeetingBySubtype.get(subtype);
    if (!live) {
        return;
    }

    liveMeetingBySubtype.delete(subtype);
    live.end();
    meetingEnded(live.areaId);
}

/** Test seam: the map is module-global, so suites have to be able to reset it. */
export function clearExternalMeetings(): void {
    for (const subtype of [...liveMeetingBySubtype.keys()]) {
        externalMeetingEnded(subtype);
    }
}
