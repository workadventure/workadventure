import type { EndTimedAnalyticsEvent } from "./TimedAnalyticsEvent";

/**
 * Turns a flickering boolean into intervals, holding one open across short gaps.
 *
 * Speech detection is the reason this exists. A volume analyser flips on syllables,
 * so closing the interval on the first quiet frame would report a sentence as a
 * dozen periods of a few hundred milliseconds — each then dropped by the pusher's
 * own one-second floor, leaving someone who talked continuously reading as close to
 * zero. A hold longer than the gaps inside speech and shorter than the gaps between
 * turns merges a sentence into one period.
 *
 * It lives here rather than inline in MediaStore so it can be tested on its own:
 * reaching the subscription there means standing up the whole media pipeline.
 */
export function createHeldIntervalTracker(
    open: () => EndTimedAnalyticsEvent,
    holdMs: number,
): { set(active: boolean): void; stop(): void } {
    let end: EndTimedAnalyticsEvent | undefined;
    let hold: ReturnType<typeof setTimeout> | undefined;

    const cancelHold = (): void => {
        if (hold !== undefined) {
            clearTimeout(hold);
            hold = undefined;
        }
    };

    /** Ends the interval now, pending hold included. Safe to call when none is open. */
    const close = (): void => {
        cancelHold();
        end?.();
        end = undefined;
    };

    return {
        set(active: boolean): void {
            if (active) {
                // Speaking again before the hold expired: the same interval continues
                // rather than a second one starting.
                cancelHold();
                end ??= open();
                return;
            }

            if (end !== undefined && hold === undefined) {
                hold = setTimeout(close, holdMs);
            }
        },
        /** The source of the signal went away — close without waiting out the hold. */
        stop: close,
    };
}
