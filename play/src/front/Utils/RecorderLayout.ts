import { recordingLayoutSchema } from "@workadventure/shared-utils";
import type { RecordingLayout } from "@workadventure/shared-utils";
import type { PipGridTile } from "../Components/Video/PictureInPicture/pictureInPictureGridLayout";

/**
 * Where a recording over the map puts the map against the cameras:
 * - "map": the map takes the whole screen, zoomed out, with one row of up to 4 cameras over its top;
 * - "balanced": up to 8 cameras on top (2×2 up to 4), the map below;
 * - "cameras": up to 16 cameras in a mosaic filling the screen, the map is its big 2×2 cell.
 * Beyond the mode's tiles, the last people to have spoken get a tile and the others are named only.
 */
export const RECORDER_LAYOUT_MODES = recordingLayoutSchema.options;
export type RecorderLayoutMode = RecordingLayout;
export const DEFAULT_RECORDER_LAYOUT_MODE: RecorderLayoutMode = "balanced";

export const RECORDER_MAX_TILES: Record<RecorderLayoutMode, number> = { map: 4, balanced: 8, cameras: 16 };

export function parseRecorderLayoutMode(value: string | null | undefined): RecorderLayoutMode {
    return RECORDER_LAYOUT_MODES.find((mode) => mode === value) ?? DEFAULT_RECORDER_LAYOUT_MODE;
}

export interface Rect {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface RecorderLayout {
    /** Where the map is shown: the game canvas is sized and placed there. */
    map: Rect;
    /** The CSS grid holding the tiles, in px. */
    grid: Rect & { columns: number; rows: number; cellWidth: number; cellHeight: number; gap: number };
    /** One tile per shown camera, in display order. */
    tiles: PipGridTile[];
}

const GAP = 8;
/** Tile height as a share of the screen, for the modes with the cameras on top. */
const ROW_SHARE = { map: 0.235, balancedUpTo4: 0.3, balanced: 0.212 };

export function computeRecorderLayout(
    mode: RecorderLayoutMode,
    cameraCount: number,
    width: number,
    height: number,
): RecorderLayout {
    const n = Math.max(0, Math.min(cameraCount, RECORDER_MAX_TILES[mode]));
    const tile = (column: number, row: number, span = 1): PipGridTile => ({
        columnStart: column + 1,
        columnEnd: column + 1 + span,
        rowStart: row + 1,
        rowEnd: row + 1 + span,
    });

    if (n === 0) {
        const full = { left: 0, top: 0, width, height };
        return { map: full, grid: { ...full, columns: 0, rows: 0, cellWidth: 0, cellHeight: 0, gap: GAP }, tiles: [] };
    }

    if (mode === "cameras") {
        const columns = Math.max(2, Math.ceil(Math.sqrt(n + 4)));
        const rows = Math.max(2, Math.ceil((n + 4) / columns));
        // The cells fill the screen: 16:9 cells would leave empty bands in the video for most camera counts.
        const cellWidth = (width - GAP * (columns + 1)) / columns;
        const cellHeight = (height - GAP * (rows + 1)) / rows;
        const grid = {
            left: GAP,
            top: GAP,
            width: width - 2 * GAP,
            height: height - 2 * GAP,
            columns,
            rows,
            cellWidth,
            cellHeight,
            gap: GAP,
        };
        const tiles: PipGridTile[] = [];
        for (let row = 0; row < rows; row++) {
            for (let column = 0; column < columns; column++) {
                if (tiles.length < n && (row >= 2 || column >= 2)) tiles.push(tile(column, row));
            }
        }
        const map = { left: grid.left, top: grid.top, width: 2 * cellWidth + GAP, height: 2 * cellHeight + GAP };
        return { map: round(map), grid, tiles };
    }

    const [columns, rows, share] =
        mode === "map"
            ? [n, 1, ROW_SHARE.map]
            : n <= 4
              ? [Math.min(n, 2), Math.ceil(n / 2), ROW_SHARE.balancedUpTo4]
              : [4, 2, ROW_SHARE.balanced];
    const cellHeight = height * share;
    const cellWidth = cellHeight * (16 / 9);
    const gridWidth = columns * cellWidth + (columns - 1) * GAP;
    const gridHeight = rows * cellHeight + (rows - 1) * GAP;
    const band = mode === "map" ? 0 : gridHeight + 2 * GAP;
    return {
        map: round({ left: 0, top: band, width, height: height - band }),
        grid: {
            left: (width - gridWidth) / 2,
            top: GAP,
            width: gridWidth,
            height: gridHeight,
            columns,
            rows,
            cellWidth,
            cellHeight,
            gap: GAP,
        },
        tiles: Array.from({ length: n }, (_, i) => tile(i % columns, Math.floor(i / columns))),
    };
}

/** The pinned items first (they keep a tile even when silent), each group in its own order. */
export function pinnedFirst<T>(items: T[], pins: string[], idOf: (item: T) => string): T[] {
    const pinned = new Set(pins);
    return [...items.filter((item) => pinned.has(idOf(item))), ...items.filter((item) => !pinned.has(idOf(item)))];
}

function round(rect: Rect): Rect {
    return {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
    };
}
