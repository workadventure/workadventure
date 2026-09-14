import { get, writable } from "svelte/store";

/**
 * The meeting this tab is in, if any.
 *
 * Analytics context, not app state: it exists so a row that is not itself a meeting —
 * a speaking period, a microphone period — can say which meeting it happened in, and
 * so a meeting can be replayed from the rows of everyone who was in it.
 *
 * One value rather than a set. The app already treats being in a meeting as singular
 * (`inJitsiStore` is a boolean, a user is in at most one proximity bubble), and the
 * two places that open a `meeting.ended` interval are the two that write here.
 */
const currentMeetingIdStore = writable<string | undefined>(undefined);

export function meetingStarted(meetingId: string): void {
    currentMeetingIdStore.set(meetingId);
}

/**
 * Guarded on the id, deliberately. Two spaces can close around each other — a bubble
 * dissolving just after a meeting area was entered — and an unguarded clear would
 * erase the meeting that is actually live.
 */
export function meetingEnded(meetingId: string): void {
    currentMeetingIdStore.update((current) => (current === meetingId ? undefined : current));
}

export function subscribeToCurrentMeeting(run: (meetingId: string | undefined) => void): () => void {
    return currentMeetingIdStore.subscribe(run);
}

/** The meeting an interval opening right now belongs to, shaped for the catalog. */
export function currentMeetingProperties(): { meetingId?: string } {
    const meetingId = get(currentMeetingIdStore);

    return meetingId === undefined ? {} : { meetingId };
}
