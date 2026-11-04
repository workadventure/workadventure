/**
 * `?recorder` in the URL: the page is filmed by the LiveKit egress. Nobody sits at it, so it shows the map and the
 * camera tiles only: no Woka of its own, no UI, and Phaser capped at 30 fps (the egress encodes at 30 fps; rendering
 * faster only burns the CPU it shares with the other recordings).
 */
const params = new URLSearchParams(window.location.search);
export const isRecorderMode = params.has("recorder");

/**
 * The LiveKit token the egress appends to the template URL (`?url=…&token=…`). The back joins this page as a recorder,
 * invisible to everyone, only if this token carries the LiveKit "recorder" grant.
 */
export const recorderToken = isRecorderMode ? (params.get("token") ?? "") : undefined;

export const RECORDER_FPS = 30;
