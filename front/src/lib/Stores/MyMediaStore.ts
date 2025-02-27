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
 * Store that contains if the camera state is stuck to off by something like the API.
 */
export const myCameraBlockedStore = writable(false);

/**
 * A store that contains whether my microphone is shown or not.
 * Typically, microphone is turn off when entering Jitsi meet.
 */
export const myMicrophoneStore = writable(false);

/**
 * Store that contains if the microphone state is stuck to off by something like the API.
 */
export const myMicrophoneBlockedStore = writable(false);

/**
 * Store that contains if the current player is in external video/audio service like Jitsi or BBB.
 * If true, microphone and camera is disabled.
 */
export const inExternalServiceStore = writable(false);
