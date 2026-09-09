const WINDOW_SIZE = 8;
// After the sender changes its target frame rate, the encoder needs a moment to settle: not instability.
const TRANSITION_MS = 2000;

/**
 * Standard deviation of the received frame rate over the last WINDOW_SIZE one-second samples, used to tell an
 * unstable connection from a stable one.
 *
 * Deliberate changes must not count as instability: when the sender tells us its target frame rate (expectedFps),
 * the window restarts on every change and stays empty while the stream is intentionally paused (expectedFps 0)
 * or still settling after a change. Without an expected frame rate, the raw frame rate is measured as before.
 */
export class FpsVariabilityTracker {
    private samples: number[] = [];
    private expectedFps: number | undefined;
    private frameWidth: number | undefined;
    private frameHeight: number | undefined;
    private transitionUntil = 0;

    /**
     * @returns the variability, or undefined while there are not enough steady samples
     */
    public push(
        fps: number,
        expectedFps: number | undefined,
        frameWidth: number,
        frameHeight: number,
        now: number,
    ): number | undefined {
        if (expectedFps !== this.expectedFps) {
            this.expectedFps = expectedFps;
            this.samples.length = 0;
            this.transitionUntil = now + TRANSITION_MS;
        }
        if (
            this.frameWidth !== undefined &&
            this.frameHeight !== undefined &&
            (frameWidth !== this.frameWidth || frameHeight !== this.frameHeight)
        ) {
            this.samples.length = 0;
        }
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;

        if (expectedFps === 0 || now < this.transitionUntil || !Number.isFinite(fps)) {
            return undefined;
        }

        this.samples.push(fps);
        if (this.samples.length > WINDOW_SIZE) {
            this.samples.shift();
        }
        if (this.samples.length < WINDOW_SIZE) {
            return undefined;
        }
        const mean = this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length;
        const variance =
            this.samples.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (this.samples.length - 1);
        return Math.sqrt(variance);
    }
}
