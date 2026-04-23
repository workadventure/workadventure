/**
 * Mosaic layout plans for room-composite recording: variable-size cells on a CSS grid.
 * Row height ratios are derived for 16:9 content: each row's weight ∝ max(column span in that row),
 * so taller rows get more vertical space when cells are wider (avoids crushing the bottom row).
 */

export const MAX_MOSAIC_VIDEOS = 16;

/** Assumed video aspect for row-height math (width : height). */
export const MOSAIC_ASSUMED_VIDEO_ASPECT = { width: 16, height: 9 } as const;

export type MosaicTilePlacement = {
    gridColumn: string;
    gridRow: string;
};

export type MosaicLayoutPlan = {
    templateColumns: string;
    templateRows: string;
    tiles: MosaicTilePlacement[];
};

/** Single grid row track (1-based line indices). */
function rowLine(r: number): string {
    return `${r} / ${r + 1}`;
}

/** 12-column grid: 1-based start column and span in column tracks (line end = start + span). */
function col12(start: number, span: number): string {
    return `${start} / ${start + span}`;
}

/**
 * Builds `grid-template-rows` from relative weights (any positive numbers).
 * Each row gets vertical space in proportion to its weight — for 16:9, weights match
 * max horizontal span in that row (wider cells need more height at the same width).
 */
export function templateRowsFromWeights(weights: number[]): string {
    return weights.map((w) => `minmax(0, ${w}fr)`).join(" ");
}

/** Layout plan for exactly `n` tiles (1..16). */
export function getMosaicLayoutPlan(n: number): MosaicLayoutPlan {
    if (n < 1 || n > MAX_MOSAIC_VIDEOS) {
        throw new RangeError(`getMosaicLayoutPlan: n must be 1..${MAX_MOSAIC_VIDEOS}, got ${n}`);
    }

    const c12 = "repeat(12, minmax(0, 1fr))";

    switch (n) {
        case 1:
            return {
                templateColumns: "minmax(0, 1fr)",
                templateRows: templateRowsFromWeights([1]),
                tiles: [{ gridColumn: "1 / -1", gridRow: "1 / -1" }],
            };
        case 2:
            return {
                templateColumns: "repeat(2, minmax(0, 1fr))",
                templateRows: templateRowsFromWeights([1]),
                tiles: [
                    { gridColumn: "1", gridRow: "1" },
                    { gridColumn: "2", gridRow: "1" },
                ],
            };
        case 3:
            // Top row max span 6, bottom full width span 12 → min-height ratio 1 : 2 for 16:9
            return {
                templateColumns: c12,
                templateRows: templateRowsFromWeights([1, 2]),
                tiles: [
                    { gridColumn: col12(1, 6), gridRow: rowLine(1) },
                    { gridColumn: col12(7, 6), gridRow: rowLine(1) },
                    { gridColumn: col12(1, 12), gridRow: rowLine(2) },
                ],
            };
        case 4:
            return {
                templateColumns: c12,
                templateRows: templateRowsFromWeights([1, 1]),
                tiles: [
                    { gridColumn: col12(1, 6), gridRow: rowLine(1) },
                    { gridColumn: col12(7, 6), gridRow: rowLine(1) },
                    { gridColumn: col12(1, 6), gridRow: rowLine(2) },
                    { gridColumn: col12(7, 6), gridRow: rowLine(2) },
                ],
            };
        case 5:
            // Row1 max span 4, row2 max span 6 → ratio 2 : 3
            return {
                templateColumns: c12,
                templateRows: templateRowsFromWeights([2, 3]),
                tiles: [
                    { gridColumn: col12(1, 4), gridRow: rowLine(1) },
                    { gridColumn: col12(5, 4), gridRow: rowLine(1) },
                    { gridColumn: col12(9, 4), gridRow: rowLine(1) },
                    { gridColumn: col12(1, 6), gridRow: rowLine(2) },
                    { gridColumn: col12(7, 6), gridRow: rowLine(2) },
                ],
            };
        case 6:
            return {
                templateColumns: c12,
                templateRows: templateRowsFromWeights([1, 1]),
                tiles: [
                    { gridColumn: col12(1, 4), gridRow: rowLine(1) },
                    { gridColumn: col12(5, 4), gridRow: rowLine(1) },
                    { gridColumn: col12(9, 4), gridRow: rowLine(1) },
                    { gridColumn: col12(1, 4), gridRow: rowLine(2) },
                    { gridColumn: col12(5, 4), gridRow: rowLine(2) },
                    { gridColumn: col12(9, 4), gridRow: rowLine(2) },
                ],
            };
        case 7:
            return {
                templateColumns: c12,
                templateRows: templateRowsFromWeights([3, 4]),
                tiles: [
                    { gridColumn: col12(1, 3), gridRow: rowLine(1) },
                    { gridColumn: col12(4, 3), gridRow: rowLine(1) },
                    { gridColumn: col12(7, 3), gridRow: rowLine(1) },
                    { gridColumn: col12(10, 3), gridRow: rowLine(1) },
                    { gridColumn: col12(1, 4), gridRow: rowLine(2) },
                    { gridColumn: col12(5, 4), gridRow: rowLine(2) },
                    { gridColumn: col12(9, 4), gridRow: rowLine(2) },
                ],
            };
        case 8:
            return {
                templateColumns: c12,
                templateRows: templateRowsFromWeights([1, 1]),
                tiles: [
                    { gridColumn: col12(1, 3), gridRow: rowLine(1) },
                    { gridColumn: col12(4, 3), gridRow: rowLine(1) },
                    { gridColumn: col12(7, 3), gridRow: rowLine(1) },
                    { gridColumn: col12(10, 3), gridRow: rowLine(1) },
                    { gridColumn: col12(1, 3), gridRow: rowLine(2) },
                    { gridColumn: col12(4, 3), gridRow: rowLine(2) },
                    { gridColumn: col12(7, 3), gridRow: rowLine(2) },
                    { gridColumn: col12(10, 3), gridRow: rowLine(2) },
                ],
            };
        case 9:
            return {
                templateColumns: c12,
                templateRows: templateRowsFromWeights([1, 1, 1]),
                tiles: [
                    { gridColumn: col12(1, 4), gridRow: rowLine(1) },
                    { gridColumn: col12(5, 4), gridRow: rowLine(1) },
                    { gridColumn: col12(9, 4), gridRow: rowLine(1) },
                    { gridColumn: col12(1, 4), gridRow: rowLine(2) },
                    { gridColumn: col12(5, 4), gridRow: rowLine(2) },
                    { gridColumn: col12(9, 4), gridRow: rowLine(2) },
                    { gridColumn: col12(1, 4), gridRow: rowLine(3) },
                    { gridColumn: col12(5, 4), gridRow: rowLine(3) },
                    { gridColumn: col12(9, 4), gridRow: rowLine(3) },
                ],
            };
        case 10:
            return {
                templateColumns: "repeat(5, minmax(0, 1fr))",
                templateRows: templateRowsFromWeights([1, 1]),
                tiles: Array.from({ length: 10 }, (_, i) => ({
                    gridColumn: `${(i % 5) + 1}`,
                    gridRow: `${Math.floor(i / 5) + 1}`,
                })),
            };
        case 11:
            return {
                templateColumns: c12,
                templateRows: templateRowsFromWeights([3, 3, 4]),
                tiles: [
                    { gridColumn: col12(1, 3), gridRow: rowLine(1) },
                    { gridColumn: col12(4, 3), gridRow: rowLine(1) },
                    { gridColumn: col12(7, 3), gridRow: rowLine(1) },
                    { gridColumn: col12(10, 3), gridRow: rowLine(1) },
                    { gridColumn: col12(1, 3), gridRow: rowLine(2) },
                    { gridColumn: col12(4, 3), gridRow: rowLine(2) },
                    { gridColumn: col12(7, 3), gridRow: rowLine(2) },
                    { gridColumn: col12(10, 3), gridRow: rowLine(2) },
                    { gridColumn: col12(1, 4), gridRow: rowLine(3) },
                    { gridColumn: col12(5, 4), gridRow: rowLine(3) },
                    { gridColumn: col12(9, 4), gridRow: rowLine(3) },
                ],
            };
        case 12:
            return {
                templateColumns: c12,
                templateRows: templateRowsFromWeights([1, 1, 1]),
                tiles: [
                    { gridColumn: col12(1, 3), gridRow: rowLine(1) },
                    { gridColumn: col12(4, 3), gridRow: rowLine(1) },
                    { gridColumn: col12(7, 3), gridRow: rowLine(1) },
                    { gridColumn: col12(10, 3), gridRow: rowLine(1) },
                    { gridColumn: col12(1, 3), gridRow: rowLine(2) },
                    { gridColumn: col12(4, 3), gridRow: rowLine(2) },
                    { gridColumn: col12(7, 3), gridRow: rowLine(2) },
                    { gridColumn: col12(10, 3), gridRow: rowLine(2) },
                    { gridColumn: col12(1, 3), gridRow: rowLine(3) },
                    { gridColumn: col12(4, 3), gridRow: rowLine(3) },
                    { gridColumn: col12(7, 3), gridRow: rowLine(3) },
                    { gridColumn: col12(10, 3), gridRow: rowLine(3) },
                ],
            };
        case 13:
            return {
                templateColumns: c12,
                templateRows: templateRowsFromWeights([4, 4, 4, 3]),
                tiles: [
                    { gridColumn: col12(1, 4), gridRow: rowLine(1) },
                    { gridColumn: col12(5, 4), gridRow: rowLine(1) },
                    { gridColumn: col12(9, 4), gridRow: rowLine(1) },
                    { gridColumn: col12(1, 4), gridRow: rowLine(2) },
                    { gridColumn: col12(5, 4), gridRow: rowLine(2) },
                    { gridColumn: col12(9, 4), gridRow: rowLine(2) },
                    { gridColumn: col12(1, 4), gridRow: rowLine(3) },
                    { gridColumn: col12(5, 4), gridRow: rowLine(3) },
                    { gridColumn: col12(9, 4), gridRow: rowLine(3) },
                    { gridColumn: col12(1, 3), gridRow: rowLine(4) },
                    { gridColumn: col12(4, 3), gridRow: rowLine(4) },
                    { gridColumn: col12(7, 3), gridRow: rowLine(4) },
                    { gridColumn: col12(10, 3), gridRow: rowLine(4) },
                ],
            };
        case 14:
            return {
                templateColumns: c12,
                templateRows: templateRowsFromWeights([3, 3, 4, 4]),
                tiles: [
                    { gridColumn: col12(1, 3), gridRow: rowLine(1) },
                    { gridColumn: col12(4, 3), gridRow: rowLine(1) },
                    { gridColumn: col12(7, 3), gridRow: rowLine(1) },
                    { gridColumn: col12(10, 3), gridRow: rowLine(1) },
                    { gridColumn: col12(1, 3), gridRow: rowLine(2) },
                    { gridColumn: col12(4, 3), gridRow: rowLine(2) },
                    { gridColumn: col12(7, 3), gridRow: rowLine(2) },
                    { gridColumn: col12(10, 3), gridRow: rowLine(2) },
                    { gridColumn: col12(1, 4), gridRow: rowLine(3) },
                    { gridColumn: col12(5, 4), gridRow: rowLine(3) },
                    { gridColumn: col12(9, 4), gridRow: rowLine(3) },
                    { gridColumn: col12(1, 4), gridRow: rowLine(4) },
                    { gridColumn: col12(5, 4), gridRow: rowLine(4) },
                    { gridColumn: col12(9, 4), gridRow: rowLine(4) },
                ],
            };
        case 15:
            return {
                templateColumns: "repeat(5, minmax(0, 1fr))",
                templateRows: templateRowsFromWeights([1, 1, 1]),
                tiles: Array.from({ length: 15 }, (_, i) => ({
                    gridColumn: `${(i % 5) + 1}`,
                    gridRow: `${Math.floor(i / 5) + 1}`,
                })),
            };
        case 16:
            return {
                templateColumns: "repeat(4, minmax(0, 1fr))",
                templateRows: templateRowsFromWeights([1, 1, 1, 1]),
                tiles: Array.from({ length: 16 }, (_, i) => ({
                    gridColumn: `${(i % 4) + 1}`,
                    gridRow: `${Math.floor(i / 4) + 1}`,
                })),
            };
        default:
            throw new RangeError(`Unhandled mosaic count: ${n}`);
    }
}
