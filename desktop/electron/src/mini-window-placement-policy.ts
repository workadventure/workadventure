export type MiniWindowBounds = { x: number; y: number; width: number; height: number };
/**
 * The mini window's size, and where it sits on its screen as a fraction of the room it has to move:
 * 0 against the left / top edge, 1 against the right / bottom edge. Unlike pixels, this keeps a panel
 * left in a corner in that corner on a screen of another size, or on another screen.
 */
export type MiniWindowPlacement = { xRatio: number; yRatio: number; width: number; height: number };

// Minimum interactive size for the mini window (People / Chat / Meeting / Controls).
export const MINI_WINDOW_MIN_WIDTH = 340;
export const MINI_WINDOW_MIN_HEIGHT = 360;

function finiteOr(value: number | undefined, fallback: number): number {
    return value !== undefined && Number.isFinite(value) ? value : fallback;
}

function ratio(offset: number, room: number): number {
    return room > 0 ? Math.min(1, Math.max(0, offset / room)) : 0;
}

/** Where a saved ratio puts the window in the room it has along one axis, or `fallback` without one. */
function offsetIn(room: number, savedRatio: number | undefined, fallback: number): number {
    return Math.min(room, Math.max(0, savedRatio !== undefined ? finiteOr(savedRatio * room, fallback) : fallback));
}

/** What to save of the mini window's bounds, given the work area of the screen it is on. */
export function miniWindowPlacement(bounds: MiniWindowBounds, workArea: MiniWindowBounds): MiniWindowPlacement {
    return {
        xRatio: ratio(bounds.x - workArea.x, workArea.width - bounds.width),
        yRatio: ratio(bounds.y - workArea.y, workArea.height - bounds.height),
        width: bounds.width,
        height: bounds.height,
    };
}

/**
 * The mini window's rectangle on a screen: its saved placement in that screen's work area, its size
 * clamped to fit, so it always opens fully on-screen. Falls back to a bottom-right default when a value
 * is missing.
 *
 * Pure function (no Electron dependency) so it can be unit-tested.
 */
export function normalizeMiniWindowBounds(
    saved: Partial<MiniWindowPlacement> | undefined,
    workArea: MiniWindowBounds,
    defaultSize = { width: 420, height: 560 },
    margin = 24
): MiniWindowBounds {
    const availableWidth = Math.max(1, workArea.width);
    const availableHeight = Math.max(1, workArea.height);
    const requestedWidth = finiteOr(saved?.width, defaultSize.width);
    const requestedHeight = finiteOr(saved?.height, defaultSize.height);
    const width = Math.min(availableWidth, Math.max(Math.min(MINI_WINDOW_MIN_WIDTH, availableWidth), requestedWidth));
    const height = Math.min(
        availableHeight,
        Math.max(Math.min(MINI_WINDOW_MIN_HEIGHT, availableHeight), requestedHeight)
    );
    const roomX = workArea.width - width;
    const roomY = workArea.height - height;

    return {
        x: Math.round(workArea.x + offsetIn(roomX, saved?.xRatio, roomX - margin)),
        y: Math.round(workArea.y + offsetIn(roomY, saved?.yRatio, roomY - margin)),
        width: Math.round(width),
        height: Math.round(height),
    };
}
