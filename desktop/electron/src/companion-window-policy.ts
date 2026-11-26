// Minimum interactive size for the companion panel (People / Chat / Meeting / Controls).
const COMPANION_MIN_WIDTH = 340;
const COMPANION_MIN_HEIGHT = 360;

export type CompanionBounds = { x: number; y: number; width: number; height: number };

function finiteOr(value: number | undefined, fallback: number): number {
    return Number.isFinite(value) ? (value as number) : fallback;
}

/**
 * Clamp a saved companion window rectangle back into the currently-available work area, so a panel
 * saved on a now-disconnected monitor (or one larger than the current screen) always reopens fully
 * on-screen. Falls back to a bottom-right default when a value is missing.
 *
 * Pure function (no Electron dependency) so it can be unit-tested with `node --test`.
 */
function normalizeCompanionBounds(
    savedBounds: Partial<CompanionBounds> | undefined,
    workArea: CompanionBounds,
    defaultSize: { width: number; height: number } = { width: 420, height: 560 },
    margin = 24
): CompanionBounds {
    const availableWidth = Math.max(1, workArea.width);
    const availableHeight = Math.max(1, workArea.height);
    const requestedWidth = finiteOr(savedBounds?.width, defaultSize.width);
    const requestedHeight = finiteOr(savedBounds?.height, defaultSize.height);
    const width = Math.min(availableWidth, Math.max(Math.min(COMPANION_MIN_WIDTH, availableWidth), requestedWidth));
    const height = Math.min(
        availableHeight,
        Math.max(Math.min(COMPANION_MIN_HEIGHT, availableHeight), requestedHeight)
    );
    const defaultX = workArea.x + workArea.width - width - margin;
    const defaultY = workArea.y + workArea.height - height - margin;
    const requestedX = finiteOr(savedBounds?.x, defaultX);
    const requestedY = finiteOr(savedBounds?.y, defaultY);
    const maxX = workArea.x + workArea.width - width;
    const maxY = workArea.y + workArea.height - height;

    return {
        x: Math.round(Math.min(maxX, Math.max(workArea.x, requestedX))),
        y: Math.round(Math.min(maxY, Math.max(workArea.y, requestedY))),
        width: Math.round(width),
        height: Math.round(height),
    };
}

export { COMPANION_MIN_WIDTH, COMPANION_MIN_HEIGHT, normalizeCompanionBounds };
