<script lang="ts">
    import { onDestroy } from "svelte";
    import { get } from "svelte/store";
    import { streamableCollectionStore } from "../Stores/StreamableCollectionStore";
    import { oneLineStreamableCollectionStore } from "../Stores/OneLineStreamableCollectionStore";
    import {
        maxVisibleVideosStore,
        orderedStreamableCollectionStore,
    } from "../Stores/OrderedStreamableCollectionStore";
    import { windowSize } from "../Stores/CoWebsiteStore";
    import { recorderLayoutModeStore, recorderMapRectStore } from "../Utils/RecorderMode";
    import { computeRecorderLayout, RECORDER_MAX_TILES } from "../Utils/RecorderLayout";
    import { pipGridTemplateColumns } from "./Video/PictureInPicture/pictureInPictureGridLayout";
    import VideoBox from "./Video/VideoBox.svelte";
    import AudioStreamWrapper from "./Video/PictureInPicture/AudioStreamWrapper.svelte";

    // The last people to have spoken come first (see orderedStreamableCollectionStore): they get the tiles.
    $effect(() => {
        maxVisibleVideosStore.set(RECORDER_MAX_TILES[$recorderLayoutModeStore]);
    });

    let layout = $derived(
        computeRecorderLayout(
            $recorderLayoutModeStore,
            $orderedStreamableCollectionStore.length,
            $windowSize.width,
            $windowSize.height,
        ),
    );
    let positions = $derived(new Map($orderedStreamableCollectionStore.map((box, index) => [box, index])));
    let hidden = $derived($orderedStreamableCollectionStore.slice(layout.tiles.length));

    // The game canvas goes where the map is shown, so the framing of RecorderDirector centers the bubble there.
    $effect(() => {
        const map = layout.map;
        const current = get(recorderMapRectStore);
        if (JSON.stringify(current) !== JSON.stringify(map)) recorderMapRectStore.set(map);
    });
    onDestroy(() => recorderMapRectStore.set(undefined));
</script>

<!-- What the egress films in ?recorder mode: the map and the camera tiles, laid out by the recording's mode. -->
<div class="fixed inset-0 -z-10 bg-[#1b1e26]"></div>
<div class="fixed inset-0 pointer-events-none z-10 not-cowebsite">
    <div
        class="absolute grid"
        style="left: {layout.grid.left}px; top: {layout.grid.top}px; width: {layout.grid.width}px; height: {layout.grid
            .height}px; gap: {layout.grid.gap}px; grid-template-columns: {pipGridTemplateColumns(
            layout.grid.columns,
        )}; grid-template-rows: repeat({Math.max(1, layout.grid.rows)}, minmax(0, 1fr));"
    >
        <!-- Arrival order, never display order: a moved <video> node can interrupt its stream (see VideoBoxLayout). -->
        {#each $oneLineStreamableCollectionStore as videoBox (videoBox.uniqueId)}
            {@const tile = layout.tiles[positions.get(videoBox) ?? Infinity]}
            {#if tile}
                <VideoBox {videoBox} layout={{ kind: "pipGrid", tile }} />
            {/if}
        {/each}
    </div>
    {#if hidden.length > 0}
        <span
            class="absolute rounded-lg bg-contrast/90 px-3 py-1 text-sm font-semibold text-white"
            style="left: {layout.map.left + 8}px; top: {layout.map.top + 8}px;"
        >
            +{hidden.length}
            {hidden
                .slice(0, 3)
                .map((box) => box.spaceUser.name)
                .join(", ")}{hidden.length > 3 ? "…" : ""}
        </span>
    {/if}
    {#each [...$streamableCollectionStore.values()] as videoBox (videoBox.uniqueId)}
        <AudioStreamWrapper {videoBox} />
    {/each}
</div>
