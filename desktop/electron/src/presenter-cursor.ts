import { screen } from "electron";
import { resolveDisplay } from "./overlay-window";

/**
 * Tracks the global cursor position over the shared display while a presenter tool (laser /
 * spotlight / loupe) is active, and reports it normalized (0..1) to the main renderer, which
 * broadcasts it to viewers over the space. Polling in main is necessary because the presenter is
 * interacting with the SHARED app, not WorkAdventure — the (unfocused) renderer can't read the
 * global cursor itself.
 *
 * Scoped to full-screen shares: the normalized position is relative to the shared display's
 * bounds, which matches how viewers map it onto the shared-screen video tile. (Window shares would
 * need the window's live bounds; out of scope for v1.)
 */

const POLL_INTERVAL_MS = 33; // ~30fps — smooth enough for a laser, light on the space channel.

let pollTimer: ReturnType<typeof setInterval> | undefined;
let currentDisplayId: number | undefined;
let onCursor: ((x: number, y: number) => void) | undefined;

function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
}

function poll(): void {
    if (!onCursor) {
        return;
    }
    try {
        const point = screen.getCursorScreenPoint();
        const display = resolveDisplay(currentDisplayId, "Presenter cursor");
        const { x, y, width, height } = display.bounds;
        if (width <= 0 || height <= 0) {
            return;
        }
        onCursor(clamp01((point.x - x) / width), clamp01((point.y - y) / height));
    } catch {
        /* getCursorScreenPoint can transiently fail; the next tick retries */
    }
}

/**
 * Start (or retarget) cursor tracking on the given display. Idempotent: re-calling with a new
 * display id just retargets. `onChange` receives normalized cursor positions.
 */
export function startPresenterCursor(displayId: number | undefined, onChange: (x: number, y: number) => void): void {
    currentDisplayId = displayId;
    onCursor = onChange;
    if (pollTimer) {
        return;
    }
    pollTimer = setInterval(poll, POLL_INTERVAL_MS);
    if (typeof pollTimer.unref === "function") {
        pollTimer.unref();
    }
    poll();
}

export function stopPresenterCursor(): void {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = undefined;
    }
    currentDisplayId = undefined;
    onCursor = undefined;
}
