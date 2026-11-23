<script lang="ts">
    import { computeRecorderLayout, RECORDER_MAX_TILES } from "../../../Utils/RecorderLayout";
    import type { RecorderLayoutMode } from "../../../Utils/RecorderLayout";

    // A miniature of what the recording films: the map and the camera tiles where RecorderLayout puts them, so the
    // picker and the producer panel show the real layout. Without a mode: the camera grid of a recording without the map.
    interface Props {
        mode: RecorderLayoutMode | undefined;
        cameraCount: number;
        // The names shown in the tiles, in tile order (the producer's preview); none in the picker's thumbnails.
        names?: string[];
    }

    let { mode, cameraCount, names = [] }: Props = $props();

    // Laid out at the egress size, then shown in percent.
    const W = 1280;
    const H = 720;

    interface Box {
        left: number;
        top: number;
        width: number;
        height: number;
    }

    const percent = (box: Box) =>
        `left: ${(box.left / W) * 100}%; top: ${(box.top / H) * 100}%; width: ${(box.width / W) * 100}%; height: ${
            (box.height / H) * 100
        }%;`;

    let boxes = $derived.by(() => {
        if (!mode) {
            const count = Math.max(1, Math.min(cameraCount, 4));
            const columns = count === 1 ? 1 : 2;
            const rows = Math.ceil(count / columns);
            const width = (W - 8 * (columns + 1)) / columns;
            const height = (H - 8 * (rows + 1)) / rows;
            return {
                map: undefined,
                tiles: Array.from({ length: count }, (_, i) => ({
                    left: 8 + (i % columns) * (width + 8),
                    top: 8 + Math.floor(i / columns) * (height + 8),
                    width,
                    height,
                })),
            };
        }
        const layout = computeRecorderLayout(mode, Math.min(cameraCount, RECORDER_MAX_TILES[mode]), W, H);
        const { grid } = layout;
        return {
            map: layout.map,
            tiles: layout.tiles.map((tile) => ({
                left: grid.left + (tile.columnStart - 1) * (grid.cellWidth + grid.gap),
                top: grid.top + (tile.rowStart - 1) * (grid.cellHeight + grid.gap),
                width:
                    (tile.columnEnd - tile.columnStart) * grid.cellWidth +
                    (tile.columnEnd - tile.columnStart - 1) * grid.gap,
                height: (tile.rowEnd - tile.rowStart) * grid.cellHeight + (tile.rowEnd - tile.rowStart - 1) * grid.gap,
            })),
        };
    });
</script>

<span class="relative block w-full aspect-video overflow-hidden rounded bg-[#1b1e26]" aria-hidden="true">
    {#if boxes.map}
        <span class="absolute rounded-sm bg-[#c99a62]" style={percent(boxes.map)}></span>
    {/if}
    {#each boxes.tiles as tile, index (index)}
        <span
            class="absolute flex items-end overflow-hidden rounded-sm bg-[#5b6b8f] outline outline-1 outline-[#1b1e26]"
            style={percent(tile)}
        >
            {#if names[index]}
                <span class="m-0.5 truncate rounded-sm bg-black/60 px-1 text-[9px] leading-tight text-white"
                    >{names[index]}</span
                >
            {/if}
        </span>
    {/each}
</span>
