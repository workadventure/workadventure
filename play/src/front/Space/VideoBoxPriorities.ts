export const SCREEN_SHARE_STARTING_PRIORITY = 1000; // Priority for screen sharing streams
export const VIDEO_STARTING_PRIORITY = 2000; // Priority for other video streams

// Bonus given to a remote user with their camera on, on the same scale as the recency bonus (0 to 100).
// With 50, a user who just stopped speaking stays before silent cameras for about 70 seconds (100s * ln 2).
const CAMERA_BONUS = 50;

/**
 * Priority of a remote camera box whose user is not currently speaking.
 * Always greater than the priority of an active speaker (VIDEO_STARTING_PRIORITY + rank).
 */
export function idleVideoBoxPriority(cameraOn: boolean, lastSpeakTimestamp: number | undefined, now: number): number {
    // Decays from 100 (just stopped speaking) towards 0 (spoke long ago).
    const recencyBonus = lastSpeakTimestamp ? 100 * Math.exp(-(now - lastSpeakTimestamp) / 100000) : 0;
    return VIDEO_STARTING_PRIORITY + 9999 - recencyBonus - (cameraOn ? CAMERA_BONUS : 0);
}
