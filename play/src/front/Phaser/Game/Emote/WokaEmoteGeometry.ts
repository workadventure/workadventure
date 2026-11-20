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

/**
 * SVG path of slice `index` as a ring sector between two radii, centred on (0, 0) and on the same
 * angles as wheelSlicePosition. `gap` trims each side, in degrees, so the slices read as separate.
 */
export function wheelSectorPath(index: number, count: number, inner: number, outer: number, gap = 1): string {
    const slice = 360 / count;
    const from = (-90 - slice / 2 + index * slice + gap) * DEG_TO_RAD;
    const to = (-90 + slice / 2 + index * slice - gap) * DEG_TO_RAD;
    const point = (radius: number, angle: number) =>
        `${(Math.cos(angle) * radius).toFixed(2)} ${(Math.sin(angle) * radius).toFixed(2)}`;
    const large = slice - 2 * gap > 180 ? 1 : 0;
    return (
        `M ${point(outer, from)} A ${outer} ${outer} 0 ${large} 1 ${point(outer, to)} ` +
        `L ${point(inner, to)} A ${inner} ${inner} 0 ${large} 0 ${point(inner, from)} Z`
    );
}
