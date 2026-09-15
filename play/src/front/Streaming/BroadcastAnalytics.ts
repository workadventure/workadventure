import { analyticsClient } from "../Administration/AnalyticsClient";
import type { EndTimedAnalyticsEvent } from "../Administration/TimedAnalyticsEvent";
import { isMeetingSpace } from "../Rules/MeetingRules";
import type { SpaceInterface } from "../Space/SpaceInterface";

/**
 * Measures a broadcast from both ends, for one space.
 *
 * Driven by the space rather than by the megaphone button, which is what makes a
 * speaker zone measured at all: it calls `space.startStreaming()` directly and never
 * goes near `startMegaphoneLive()`. Both halves carry the space name as `broadcastId`,
 * so an audience row can be joined to the airtime it was listening to, and the same
 * `broadcastKind` — one event family for both surfaces, told apart by a property, the
 * way meeting.ended tells a bubble from a meeting area.
 *
 * Nothing is reported for a conversation space — that is a meeting, and
 * `SpacePeerManager` measures it as one.
 *
 * @returns the teardown, which closes whatever is still open.
 */
export function trackBroadcastAnalytics(space: SpaceInterface): () => void {
    if (isMeetingSpace(space.filterType)) {
        return () => {};
    }

    // Read per open rather than once: the world megaphone space is handed its
    // metadata at join, but nothing stops a space from being told later.
    const broadcastContext = () => ({
        broadcastId: space.getName(),
        broadcastKind:
            space.getMetadata().get("isMegaphoneSpace") === true ? ("megaphone" as const) : ("speaker_zone" as const),
    });
    let endAudience: EndTimedAnalyticsEvent | undefined;
    let endAirtime: EndTimedAnalyticsEvent | undefined;

    // One interval for the whole time *someone* is on air, not one per speaker: a listener
    // who sat through a panel of three listened once. The store excludes the local user, so
    // own airtime — which is the other event — never counts as audience time.
    const unsubscribeAudience = space.hasRemoteSpeakerStore.subscribe((someoneOnAir: boolean) => {
        if (someoneOnAir) {
            endAudience ??= analyticsClient.openTimedEvent("broadcast.audience.ended", broadcastContext(), {
                reopenOnReconnect: true,
            });

            return;
        }

        endAudience?.();
        endAudience = undefined;
    });

    // In a broadcast space this store is the local `megaphoneState` and nothing else —
    // listener streaming, which the seeAttendees feature turns on for the audience,
    // deliberately does not set it.
    const unsubscribeAirtime = space.isStreamingAudioStore.subscribe((onAir: boolean) => {
        if (onAir) {
            // The interval must not restart: the megaphone is reachable twice without an
            // intervening stop — the modal and the action bar both lead there — and
            // reopening would lose the time already broadcast.
            endAirtime ??= analyticsClient.openTimedEvent(
                "megaphone.ended",
                broadcastContext(),
                // A reconnect ends the interval without ending the broadcast, and nothing
                // fires a second start.
                { reopenOnReconnect: true },
            );

            return;
        }

        endAirtime?.();
        endAirtime = undefined;
    });

    return () => {
        unsubscribeAudience();
        unsubscribeAirtime();
        endAudience?.();
        endAirtime?.();
    };
}
