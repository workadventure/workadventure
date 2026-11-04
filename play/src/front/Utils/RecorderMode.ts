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

/**
 * The space being recorded (a meeting area, a bubble, a megaphone), as its users name it, and its filter type. The
 * recorder joins it by name and never by where it stands: a bubble walks around and a megaphone speaker can be anywhere.
 */
export const recorderSpace = isRecorderMode ? (params.get("space") ?? undefined) : undefined;
export const recorderSpaceFilter = isRecorderMode ? Number(params.get("filter") ?? 0) : 0;
