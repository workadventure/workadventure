import type { WokaEmoteState } from "./WokaEmoteCatalog";

/** Woka sprites are 32×32 with their origin at the centre, so the feet sit 16px below it. */
export const FEET_OFFSET = 16;

const DEG_TO_RAD = Math.PI / 180;

/**
 * Phaser scales and rotates a sprite around its origin, which for a Woka is its waist. Left alone, a
 * squash would sink the Woka into the floor and a tilt would swing its feet through the air. This
 * returns the offset that pins the feet to the ground instead, which is what makes the motion read
 * as weight rather than as a sliding image.
 *
 * Kept free of any Phaser import so it can be exercised without booting a game.
 */
export function feetAnchoredOffset(state: WokaEmoteState): { x: number; y: number } {
    const radians = state.angle * DEG_TO_RAD;
    return {
        x: state.x + FEET_OFFSET * state.scaleY * Math.sin(radians),
        y: state.y + FEET_OFFSET - FEET_OFFSET * state.scaleY * Math.cos(radians),
    };
}

/**
 * Where slice `index` sits relative to the centre of the wheel. Slice 0 is at the top and they run
 * clockwise, which is the order the keyboard and the digit shortcuts follow too.
 */
export function wheelSlicePosition(index: number, count: number, radius: number): { x: number; y: number } {
    const angle = (-90 + (index * 360) / count) * DEG_TO_RAD;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

/**
 * Which slice a pointer at (dx, dy) from the centre is aiming at, or null inside the dead zone —
 * aiming at the middle of the wheel selects nothing, so it can be dismissed without picking.
 */
export function wheelSliceAt(dx: number, dy: number, count: number, deadZone: number): number | null {
    if (Math.hypot(dx, dy) < deadZone) {
        return null;
    }
    const degrees = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    const slice = 360 / count;
    return ((Math.round(degrees / slice) % count) + count) % count;
}
