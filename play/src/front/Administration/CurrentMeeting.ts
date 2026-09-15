import { get, readonly, writable } from "svelte/store";

/**
 * The meeting this tab is in, if any.
 *
 * Analytics context, not app state: it exists so a row that is not itself a meeting —
 * a speaking period, a microphone period — can say which meeting it happened in, and
 * so a meeting can be replayed from the rows of everyone who was in it. One value
 * rather than a set, because the app already treats being in a meeting as singular.
 */
const meetingIdStore = writable<string | undefined>(undefined);

export const currentMeetingIdStore = readonly(meetingIdStore);

export function meetingStarted(meetingId: string): void {
    meetingIdStore.set(meetingId);
}

/**
 * Guarded on the id, deliberately. Two spaces can close around each other — a bubble
 * dissolving just after a meeting area was entered — and an unguarded clear would
 * erase the meeting that is actually live.
 */
export function meetingEnded(meetingId: string): void {
    meetingIdStore.update((current) => (current === meetingId ? undefined : current));
}

/** The meeting an interval opening right now belongs to, shaped for the catalog. */
export function currentMeetingProperties(): { meetingId?: string } {
    return { meetingId: get(meetingIdStore) };
}
