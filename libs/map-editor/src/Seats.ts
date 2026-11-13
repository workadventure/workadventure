import type { SeatPropertyData } from "./types";

export type SeatDirection = SeatPropertyData["direction"];

export interface SeatRectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface SeatPosition {
    /** Center of the seated player's 32x32 sprite. */
    x: number;
    y: number;
    direction: SeatDirection;
    /**
     * Whether the seated player is drawn in front of the seat. A seat facing up has its backrest
     * towards the viewer: the player sits behind it, only the head and shoulders showing.
     */
    inFront: boolean;
}

const TILE = 32;

/**
 * How far above the seat a seated player is drawn, so that they sit on the seat rather than stand
 * in front of it. Higher for a seat facing up, so the head shows above the backrest.
 */
const SIT_LIFT: Record<SeatDirection, number> = {
    down: 6,
    up: 10,
    left: 6,
    right: 6,
};

/**
 * The places on a seat object (or area), side by side.
 *
 * The seat is in the bottom row of tiles: an armchair is drawn with its backrest above the seat.
 * Seats facing up or down are spread along the width (a couch seats several people next to each
 * other); seats facing left or right are stacked upwards from the bottom row.
 */
export function getSeatPositions(
    rect: SeatRectangle,
    property: Pick<SeatPropertyData, "direction" | "seats">,
): SeatPosition[] {
    const direction = property.direction ?? "down";
    const count = Math.max(1, Math.floor(property.seats ?? 1));
    const lift = SIT_LIFT[direction];
    const bottomRowCenter = rect.y + rect.height - Math.min(TILE, rect.height) / 2;
    const positions: SeatPosition[] = [];

    for (let i = 0; i < count; i++) {
        let x: number;
        let y: number;
        if (direction === "down" || direction === "up") {
            x = rect.x + (rect.width * (i + 0.5)) / count;
            y = bottomRowCenter;
        } else {
            x = rect.x + rect.width / 2;
            // Rows go upwards from the bottom one, without leaving the rectangle.
            y = Math.max(rect.y + TILE / 2, bottomRowCenter - TILE * (count - 1 - i));
        }
        positions.push({
            x: Math.round(x),
            y: Math.round(y - lift),
            direction,
            inFront: direction !== "up",
        });
    }
    return positions;
}
