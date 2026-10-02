import { get, writable } from "svelte/store";
import { isMeetingSpace } from "../Rules/MeetingRules";
import type { SpaceInterface } from "../Space/SpaceInterface";
import type { EndTimedAnalyticsEvent } from "./TimedAnalyticsEvent";

/** The meeting a row belongs to, shaped for the catalog. Empty outside any meeting. */
export type MeetingContext = { meetingId?: string };

/**
 * The meetings this tab is in, in the order they were joined.
 *
 * Analytics context, not app state: it exists so a row that is not itself a meeting —
 * a speaking period, a microphone period, a muted camera — can say which meeting it
 * happened in, and so a meeting can be replayed from the rows of everyone in it.
 *
 * A list rather than one value, because the tab can be in several meetings at once:
 * two meeting areas drawn over each other, a Jitsi zone over a LiveKit area, or the
 * moment between entering an area and the bubble dissolving. The rule for what gets
 * in is where this tab SENDS its media: a period is reported once per meeting that
 * hears it — exact for each meeting, at the price of counting the overlap twice in a
 * total across meetings. A space the tab only receives from, a listener zone, is a
 * broadcast and never registers, so a bubble formed inside one reports to the bubble
 * alone. An action taken on one participant belongs to that participant's space alone;
 * see `meetingOf`.
 */
const liveMeetingIdsStore = writable<readonly string[]>([]);

export function meetingStarted(meetingId: string): void {
    liveMeetingIdsStore.update((ids) => (ids.includes(meetingId) ? ids : [...ids, meetingId]));
}

export function meetingEnded(meetingId: string): void {
    liveMeetingIdsStore.update((ids) => (ids.includes(meetingId) ? ids.filter((id) => id !== meetingId) : ids));
}

/** One context per live meeting, or a single empty one outside any: a row is emitted per entry. */
export function liveMeetingContexts(): MeetingContext[] {
    return contextsOf(get(liveMeetingIdsStore));
}

/**
 * The meeting an action on a participant of `space` belongs to. A broadcast space is
 * not a meeting, so an action there names none and falls back to the live meetings.
 */
export function meetingOf(space: Pick<SpaceInterface, "filterType" | "getName">): MeetingContext {
    return isMeetingSpace(space.filterType) ? { meetingId: space.getName() } : {};
}

/**
 * Opens one interval per live meeting and keeps that set in step with the meetings:
 * a meeting joined mid-interval gets its own, a meeting left has its own closed. A
 * period that straddles a meeting boundary is thereby cut at it rather than attributed
 * whole — half of it happened in the meeting and half did not.
 *
 * @returns the closer for the whole set. Idempotent.
 */
export function openTimedEventPerMeeting(
    open: (context: MeetingContext) => EndTimedAnalyticsEvent,
): EndTimedAnalyticsEvent {
    const openIntervals = new Map<string, EndTimedAnalyticsEvent>();
    let closed = false;

    const unsubscribe = liveMeetingIdsStore.subscribe((ids) => {
        const wanted = contextsOf(ids).map((context) => context.meetingId ?? "");
        for (const [key, end] of openIntervals) {
            if (!wanted.includes(key)) {
                end();
                openIntervals.delete(key);
            }
        }
        for (const key of wanted) {
            if (!openIntervals.has(key)) {
                openIntervals.set(key, open(key === "" ? {} : { meetingId: key }));
            }
        }
    });

    return () => {
        if (closed) {
            return;
        }
        closed = true;
        unsubscribe();
        for (const end of openIntervals.values()) {
            end();
        }
        openIntervals.clear();
    };
}

function contextsOf(ids: readonly string[]): MeetingContext[] {
    return ids.length === 0 ? [{}] : ids.map((meetingId) => ({ meetingId }));
}
