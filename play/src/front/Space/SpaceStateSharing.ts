import deepEqual from "fast-deep-equal";
import type { SpaceState } from "@workadventure/shared-utils";

/**
 * Returns `next`, reusing the objects of `previous` wherever nothing changed: each slice, and each poll or question.
 *
 * Every patch rebuilds the whole state (clone, patch, schema parse), so without this every slice would be a new
 * object after any change, and every store reading one would notify. With it, "unchanged" is a reference check:
 * a raised hand does not touch the polls, and a vote only touches its poll.
 */
export function shareUnchanged(previous: SpaceState, next: SpaceState): SpaceState {
    return {
        raisedHands: keep(previous.raisedHands, next.raisedHands),
        floorHolders: keep(previous.floorHolders, next.floorHolders),
        recording: keep(previous.recording, next.recording),
        polls: keepEntries(previous.polls, next.polls),
        questions: keepEntries(previous.questions, next.questions),
    };
}

function keep<T>(previous: T, next: T): T {
    return deepEqual(previous, next) ? previous : next;
}

function keepEntries<T>(previous: Record<string, T>, next: Record<string, T>): Record<string, T> {
    const entries = Object.entries(next).map(
        ([id, value]) => [id, id in previous ? keep(previous[id], value) : value] as const,
    );
    const unchanged =
        entries.length === Object.keys(previous).length && entries.every(([id, value]) => previous[id] === value);
    return unchanged ? previous : Object.fromEntries(entries);
}
