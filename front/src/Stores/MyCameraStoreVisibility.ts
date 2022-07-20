import { writable } from "svelte/store";

/**
 * A store that contains whether the proximity meeting is turn on.
 */

export const proximityMeetingStore = writable(true);

/**
 * A store that contains whether my camera is shown or not.
 * Typically, the overlay is hidden when entering Jitsi meet.
 */

export const myCameraStore = writable(false);

/**
 * A store that contains whether my microphone is shown or not.
 * Typically, microphone is turn off when entering Jitsi meet.
 */

export const myMicrophoneStore = writable(false);

export const inExternalServiceStore = writable(false);
