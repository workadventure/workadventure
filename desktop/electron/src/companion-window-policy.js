"use strict";

// Minimum interactive size for the companion panel (People / Chat / Meeting / Controls).
const COMPANION_MIN_WIDTH = 340;
const COMPANION_MIN_HEIGHT = 360;

/**
 * Clamp a saved companion window rectangle back into the currently-available work area, so a panel
 * saved on a now-disconnected monitor (or one larger than the current screen) always reopens fully
 * on-screen. Falls back to a bottom-right default when a value is missing.
 *
 * Pure function (no Electron dependency) so it can be unit-tested with `node --test`.
 */
function normalizeCompanionBounds(savedBounds, workArea, defaultSize = { width: 420, height: 560 }, margin = 24) {
    const availableWidth = Math.max(1, workArea.width);
    const availableHeight = Math.max(1, workArea.height);
    const requestedWidth = Number.isFinite(savedBounds && savedBounds.width) ? savedBounds.width : defaultSize.width;
    const requestedHeight = Number.isFinite(savedBounds && savedBounds.height) ? savedBounds.height : defaultSize.height;
    const width = Math.min(availableWidth, Math.max(Math.min(COMPANION_MIN_WIDTH, availableWidth), requestedWidth));
    const height = Math.min(
        availableHeight,
        Math.max(Math.min(COMPANION_MIN_HEIGHT, availableHeight), requestedHeight)
    );
    const defaultX = workArea.x + workArea.width - width - margin;
    const defaultY = workArea.y + workArea.height - height - margin;
    const requestedX = Number.isFinite(savedBounds && savedBounds.x) ? savedBounds.x : defaultX;
    const requestedY = Number.isFinite(savedBounds && savedBounds.y) ? savedBounds.y : defaultY;
    const maxX = workArea.x + workArea.width - width;
    const maxY = workArea.y + workArea.height - height;

    return {
        x: Math.round(Math.min(maxX, Math.max(workArea.x, requestedX))),
        y: Math.round(Math.min(maxY, Math.max(workArea.y, requestedY))),
        width: Math.round(width),
        height: Math.round(height),
    };
}

module.exports = {
    COMPANION_MIN_WIDTH,
    COMPANION_MIN_HEIGHT,
    normalizeCompanionBounds,
};
