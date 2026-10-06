const TILED_TILE_FLIP_FLAGS = 0xe0000000;

/**
 * Minimum ratio of non-empty cells for a layer to be worth rendering on the GPU.
 *
 * Down to this ratio we accept the GPU path shading up to about three times the pixels the classic
 * path would, in exchange for dropping its per-tile CPU work. Below it the trade stops paying: such
 * a layer holds few enough tiles for batching them to be cheap, so the constant full-viewport pass
 * buys nothing.
 */
const MIN_GPU_LAYER_FILL_RATIO = 0.35;

/**
 * Minimum number of non-empty cells for a layer to be worth rendering on the GPU, whatever its fill
 * ratio. A handful of quads never justifies a full-viewport shader pass, even on a small map whose
 * layers are densely filled.
 */
const MIN_GPU_LAYER_FILLED_CELLS = 256;

export type TileLayerStats = {
    /** The distinct non-empty tile indices used by the layer, flip flags stripped. */
    tileIndices: Set<number>;
    /** The number of non-empty cells in the layer. */
    filledCellCount: number;
    /** The total number of cells in the layer. */
    cellCount: number;
};

/**
 * Scans a Tiled tile layer's raw data in a single pass.
 *
 * Returns undefined when the data cannot be read directly, which is the case for the encoded and
 * compressed layer formats. Callers should then fall back to the classic renderer.
 */
export function getTileLayerStats(data: string | number[]): TileLayerStats | undefined {
    if (!Array.isArray(data)) {
        return undefined;
    }

    const tileIndices = new Set<number>();
    let filledCellCount = 0;
    for (const tileId of data) {
        if (typeof tileId !== "number") {
            return undefined;
        }
        const tileIndex = tileId & ~TILED_TILE_FLIP_FLAGS;
        if (tileIndex > 0) {
            tileIndices.add(tileIndex);
            filledCellCount++;
        }
    }

    return { tileIndices, filledCellCount, cellCount: data.length };
}

/**
 * Tells whether a tile layer is dense enough to be rendered as a Phaser `TilemapGPULayer`.
 *
 * A `TilemapGPULayer` is drawn as a single quad covering the whole layer: a fragment shader resolves
 * the tile for every pixel the layer covers on screen. Its cost is therefore the on-screen area of
 * the layer, whatever the layer actually holds. A classic `TilemapLayer` batches one quad per
 * non-empty visible tile instead, so its cost follows the tile count.
 *
 * That makes the GPU layer a win on dense layers, where it shades the same pixels while moving the
 * per-tile work off the CPU, and a heavy loss on the sparse overlay layers maps are full of: a door
 * layer holding four tiles still costs a full-viewport shader pass on every frame. Zoomed out on a
 * 4K screen that is roughly 6 MPixels of shading to draw four tiles, and a map carrying a dozen such
 * layers saturates an integrated GPU (see https://github.com/workadventure/workadventure/issues/6399).
 *
 * Sending sparse layers back to the classic path costs little by construction: few tiles means few
 * quads to batch.
 */
export function isWorthRenderingOnGpu(stats: TileLayerStats): boolean {
    if (stats.filledCellCount < MIN_GPU_LAYER_FILLED_CELLS) {
        return false;
    }

    return stats.filledCellCount >= stats.cellCount * MIN_GPU_LAYER_FILL_RATIO;
}
