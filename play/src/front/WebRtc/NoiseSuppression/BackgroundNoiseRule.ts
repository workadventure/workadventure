// Below this RNNoise voice probability, the frame holds the background alone: the noise between words, or the room.
const VOICELESS_VAD = 0.5;
// 1.5 s of voiceless 10 ms frames.
const WINDOW_FRAMES = 150;
// Median RMS of the voiceless frames above which the background is noisy (-36.5 dBFS). Measured on the clips of
// workadventure/noise-suppression through Chrome's noise suppression: clean speech and quiet rooms stay below 0.003,
// noisy rooms (air conditioning, restaurant, constant noise) reach 0.02 and more.
export const NOISY_RMS = 0.015;

/**
 * Detects sustained background noise, even under speech: it looks at the level of the frames without voice. The
 * median ignores short sounds (a door, a cough, a bark): only a background that stays loud counts.
 */
export class BackgroundNoiseRule {
    private readonly levels = new Float32Array(WINDOW_FRAMES);
    private count = 0;

    /** Returns true when the last 1.5 s of voiceless frames had a noisy median level. */
    public push(vad: number, rms: number): boolean {
        if (vad >= VOICELESS_VAD) {
            return false;
        }
        this.levels[this.count++] = rms;
        if (this.count < WINDOW_FRAMES) {
            return false;
        }
        this.count = 0;
        return this.levels.sort()[WINDOW_FRAMES / 2] > NOISY_RMS;
    }
}
