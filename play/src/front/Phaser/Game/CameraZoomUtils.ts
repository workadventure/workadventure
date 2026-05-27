// Explorer menu zoom buttons need a different feel from wheel/pinch zoom:
// clicks should animate to a clear step, while long presses should keep moving at a steady pace.
export const BUTTON_ZOOM_STEP_FACTOR = 1.2;

// A click uses a longer ease-in-out animation so the first frame does not feel like a jump.
export const SMOOTH_BUTTON_ZOOM_DURATION = 520;

// Long press keeps the previous rhythm: roughly one x1.2 zoom step every 375ms.
export const CONTINUOUS_BUTTON_ZOOM_STEP_DURATION = 375;
export const SMOOTH_BUTTON_ZOOM_TARGET_EPSILON = 0.001;
export const BUTTON_ZOOM_FACTOR_PER_SECOND = Math.pow(
    BUTTON_ZOOM_STEP_FACTOR,
    1000 / CONTINUOUS_BUTTON_ZOOM_STEP_DURATION,
);

/**
 * Retargets quick repeated clicks from the previous destination, not from the current in-flight zoom.
 * This avoids restarting from a partially animated value and makes repeated clicks feel like one continuous motion.
 */
export function getRetargetedButtonZoomModifier(
    currentZoomModifier: number,
    zoomFactor: number,
    targetZoomModifier: number | undefined,
): number {
    return (targetZoomModifier ?? currentZoomModifier) * zoomFactor;
}

/**
 * Computes the click animation position using elapsed time from the beginning of the current click animation.
 * CameraManager resets the start value and elapsed time every time the click target is retargeted.
 */
export function getSmoothButtonZoomModifier(
    currentZoomModifier: number,
    targetZoomModifier: number,
    deltaMs: number,
    durationMs = SMOOTH_BUTTON_ZOOM_DURATION,
): number {
    if (durationMs <= 0) {
        return targetZoomModifier;
    }

    if (deltaMs >= durationMs) {
        return targetZoomModifier;
    }

    const progress = deltaMs / durationMs;
    const easedProgress = -(Math.cos(Math.PI * progress) - 1) / 2;
    return currentZoomModifier + (targetZoomModifier - currentZoomModifier) * easedProgress;
}

/**
 * Converts a per-second zoom factor to the factor that should be applied during one Phaser update frame.
 */
export function getContinuousButtonZoomFactor(zoomFactorPerSecond: number, deltaMs: number): number {
    return Math.pow(zoomFactorPerSecond, deltaMs / 1000);
}
