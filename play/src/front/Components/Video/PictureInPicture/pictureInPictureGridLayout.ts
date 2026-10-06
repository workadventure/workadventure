/**
 * Simple grid layouts for the Picture-in-Picture video strip (8 tiles max).
 * The layout adapts to the container's aspect ratio (portrait = height > width).
 */

export const PIP_GRID_MAX_VIDEOS = 8;

/** 1-based CSS grid lines, **exclusive** end (like grid-column: a / b). */
export type PipGridTile = {
    columnStart: number;
    columnEnd: number;
    rowStart: number;
    rowEnd: number;
};

export type PipGridLayout = {
    portrait: boolean;
    videoCount: number;
    /** Number of column tracks (grid lines = tracks + 1). */
    columnTracks: number;
    /** Number of row tracks. */
    rowTracks: number;
    tiles: PipGridTile[];
    /** Human-readable summary, for debugging. */
    description: string;
};

function clampCount(n: number): number {
    if (!Number.isFinite(n) || n < 0) {
        return 0;
    }
    return Math.min(PIP_GRID_MAX_VIDEOS, Math.floor(n));
}

/**
 * Equal columns: `repeat(n, minmax(0, 1fr))`.
 * Equal rows: same, with `rowTracks`.
 */
export function pipGridTemplateColumns(columnTracks: number): string {
    return `repeat(${Math.max(1, columnTracks)}, minmax(0, 1fr))`;
}

export function pipGridTemplateRows(rowTracks: number): string {
    return `repeat(${Math.max(1, rowTracks)}, minmax(0, 1fr))`;
}

/**
 * Computes where each tile (indices 0 … n-1) goes.
 */
export function computePictureInPictureGridLayout(
    videoCount: number,
    containerWidth: number,
    containerHeight: number,
): PipGridLayout {
    const n = clampCount(videoCount);
    const portrait = containerHeight > containerWidth;

    const isFullWidth = containerWidth > containerHeight * 3;
    if (isFullWidth) {
        return {
            portrait: false,
            videoCount: n,
            columnTracks: n,
            rowTracks: 1,
            // Create a grid with all videos in one row
            tiles: Array.from({ length: n }, (_, i) => ({
                columnStart: i + 1,
                columnEnd: i + 2,
                rowStart: 1,
                rowEnd: 2,
            })),
            description: `${n} videos: single row (w > h×3)`,
        };
    }

    const isFullHeight = containerHeight > containerWidth * 2;
    if (isFullHeight) {
        return {
            portrait: true,
            videoCount: n,
            columnTracks: 1,
            rowTracks: n,
            tiles: Array.from({ length: n }, (_, i) => ({
                columnStart: 1,
                columnEnd: 2,
                rowStart: i + 1,
                rowEnd: i + 2,
            })),
            description: `${n} videos: single column (h > w×2)`,
        };
    }

    if (n === 0) {
        return {
            portrait,
            videoCount: n,
            columnTracks: 1,
            rowTracks: 1,
            tiles: [],
            description: "No video",
        };
    }

    if (n === 1) {
        return {
            portrait,
            videoCount: n,
            columnTracks: 1,
            rowTracks: 1,
            tiles: [{ columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 }],
            description: "1 video: fills the frame",
        };
    }

    if (n === 2) {
        if (portrait) {
            return {
                portrait,
                videoCount: n,
                columnTracks: 1,
                rowTracks: 2,
                tiles: [
                    { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
                    { columnStart: 1, columnEnd: 2, rowStart: 2, rowEnd: 3 },
                ],
                description: "2 portrait: column",
            };
        }
        return {
            portrait,
            videoCount: n,
            columnTracks: 2,
            rowTracks: 1,
            tiles: [
                { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
                { columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
            ],
            description: "2 landscape: row",
        };
    }

    if (n === 3) {
        if (portrait) {
            // 2 on top, 1 full-width below
            return {
                portrait,
                videoCount: n,
                columnTracks: 2,
                rowTracks: 2,
                tiles: [
                    { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
                    { columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
                    { columnStart: 1, columnEnd: 3, rowStart: 2, rowEnd: 3 },
                ],
                description: "3 portrait: 2 on top + 1 below",
            };
        }
        // 1 full-height on the left, 2 stacked on the right
        return {
            portrait,
            videoCount: n,
            columnTracks: 2,
            rowTracks: 2,
            tiles: [
                { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 3 },
                { columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
                { columnStart: 2, columnEnd: 3, rowStart: 2, rowEnd: 3 },
            ],
            description: "3 landscape: 1 left + 2 stacked right",
        };
    }

    if (n === 4) {
        return {
            portrait,
            videoCount: n,
            columnTracks: 2,
            rowTracks: 2,
            tiles: [
                { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
                { columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
                { columnStart: 1, columnEnd: 2, rowStart: 2, rowEnd: 3 },
                { columnStart: 2, columnEnd: 3, rowStart: 2, rowEnd: 3 },
            ],
            description: "4: 2×2 grid",
        };
    }

    if (n === 5) {
        if (portrait) {
            // 2 on top, 1 full-width in the middle, 2 at the bottom (2 columns × 3 rows)
            return {
                portrait,
                videoCount: n,
                columnTracks: 2,
                rowTracks: 3,
                tiles: [
                    { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
                    { columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
                    { columnStart: 1, columnEnd: 3, rowStart: 2, rowEnd: 3 },
                    { columnStart: 1, columnEnd: 2, rowStart: 3, rowEnd: 4 },
                    { columnStart: 2, columnEnd: 3, rowStart: 3, rowEnd: 4 },
                ],
                description: "5 portrait: 2 on top + 1 full-width + 2 at the bottom",
            };
        }
        // 3 on top, 2 below: 6 virtual columns, top tiles span 2 each, bottom tiles span 3 each
        return {
            portrait,
            videoCount: n,
            columnTracks: 6,
            rowTracks: 2,
            tiles: [
                { columnStart: 1, columnEnd: 3, rowStart: 1, rowEnd: 2 },
                { columnStart: 3, columnEnd: 5, rowStart: 1, rowEnd: 2 },
                { columnStart: 5, columnEnd: 7, rowStart: 1, rowEnd: 2 },
                { columnStart: 1, columnEnd: 4, rowStart: 2, rowEnd: 3 },
                { columnStart: 4, columnEnd: 7, rowStart: 2, rowEnd: 3 },
            ],
            description: "5 landscape: 3 on top + 2 below",
        };
    }

    if (n === 6) {
        if (portrait) {
            return {
                portrait,
                videoCount: n,
                columnTracks: 2,
                rowTracks: 3,
                tiles: [
                    { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
                    { columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
                    { columnStart: 1, columnEnd: 2, rowStart: 2, rowEnd: 3 },
                    { columnStart: 2, columnEnd: 3, rowStart: 2, rowEnd: 3 },
                    { columnStart: 1, columnEnd: 2, rowStart: 3, rowEnd: 4 },
                    { columnStart: 2, columnEnd: 3, rowStart: 3, rowEnd: 4 },
                ],
                description: "6 portrait: 2 columns × 3 rows",
            };
        }
        return {
            portrait,
            videoCount: n,
            columnTracks: 3,
            rowTracks: 2,
            tiles: [
                { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
                { columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
                { columnStart: 3, columnEnd: 4, rowStart: 1, rowEnd: 2 },
                { columnStart: 1, columnEnd: 2, rowStart: 2, rowEnd: 3 },
                { columnStart: 2, columnEnd: 3, rowStart: 2, rowEnd: 3 },
                { columnStart: 3, columnEnd: 4, rowStart: 2, rowEnd: 3 },
            ],
            description: "6 landscape: 3 columns × 2 rows",
        };
    }

    if (n === 7) {
        if (portrait) {
            // 2 on top, 1 full-width, then 2 rows of 2 (2 columns × 4 rows)
            return {
                portrait,
                videoCount: n,
                columnTracks: 2,
                rowTracks: 4,
                tiles: [
                    { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
                    { columnStart: 1, columnEnd: 2, rowStart: 3, rowEnd: 4 },
                    { columnStart: 1, columnEnd: 2, rowStart: 4, rowEnd: 5 },
                    { columnStart: 1, columnEnd: 3, rowStart: 2, rowEnd: 3 },
                    { columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
                    { columnStart: 2, columnEnd: 3, rowStart: 3, rowEnd: 4 },
                    { columnStart: 2, columnEnd: 3, rowStart: 4, rowEnd: 5 },
                ],
                description: "7 portrait: 2 on top + 1 full-width + 2×2",
            };
        }
        // 4 on top, 3 below: 12 virtual columns, top tiles span 3 each, bottom tiles span 4 each
        return {
            portrait,
            videoCount: n,
            columnTracks: 12,
            rowTracks: 2,
            tiles: [
                { columnStart: 1, columnEnd: 4, rowStart: 1, rowEnd: 2 },
                { columnStart: 4, columnEnd: 7, rowStart: 1, rowEnd: 2 },
                { columnStart: 7, columnEnd: 10, rowStart: 1, rowEnd: 2 },
                { columnStart: 10, columnEnd: 13, rowStart: 1, rowEnd: 2 },
                { columnStart: 1, columnEnd: 5, rowStart: 2, rowEnd: 3 },
                { columnStart: 5, columnEnd: 9, rowStart: 2, rowEnd: 3 },
                { columnStart: 9, columnEnd: 13, rowStart: 2, rowEnd: 3 },
            ],
            description: "7 landscape: 4 on top + 3 below",
        };
    }

    // n === 8
    if (portrait) {
        return {
            portrait,
            videoCount: n,
            columnTracks: 2,
            rowTracks: 4,
            tiles: [
                { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
                { columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
                { columnStart: 1, columnEnd: 2, rowStart: 2, rowEnd: 3 },
                { columnStart: 2, columnEnd: 3, rowStart: 2, rowEnd: 3 },
                { columnStart: 1, columnEnd: 2, rowStart: 3, rowEnd: 4 },
                { columnStart: 2, columnEnd: 3, rowStart: 3, rowEnd: 4 },
                { columnStart: 1, columnEnd: 2, rowStart: 4, rowEnd: 5 },
                { columnStart: 2, columnEnd: 3, rowStart: 4, rowEnd: 5 },
            ],
            description: "8 portrait: 2 columns × 4 rows",
        };
    }
    return {
        portrait,
        videoCount: n,
        columnTracks: 4,
        rowTracks: 2,
        tiles: [
            { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
            { columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
            { columnStart: 3, columnEnd: 4, rowStart: 1, rowEnd: 2 },
            { columnStart: 4, columnEnd: 5, rowStart: 1, rowEnd: 2 },
            { columnStart: 1, columnEnd: 2, rowStart: 2, rowEnd: 3 },
            { columnStart: 2, columnEnd: 3, rowStart: 2, rowEnd: 3 },
            { columnStart: 3, columnEnd: 4, rowStart: 2, rowEnd: 3 },
            { columnStart: 4, columnEnd: 5, rowStart: 2, rowEnd: 3 },
        ],
        description: "8 landscape: 4 columns × 2 rows",
    };
}

export function pipTileStyle(t: PipGridTile): string {
    return `grid-column: ${t.columnStart} / ${t.columnEnd}; grid-row: ${t.rowStart} / ${t.rowEnd};`;
}
