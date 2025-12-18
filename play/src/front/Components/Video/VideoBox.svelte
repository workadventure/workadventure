<script lang="ts">
    import MediaBox from "../Video/MediaBox.svelte";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { VideoBox } from "../../Space/Space";
    import { oneLineStreamableCollectionStore } from "../../Stores/OneLineStreamableCollectionStore";
    import { playerMovedInTheLast10Seconds } from "../../Stores/VideoLayoutStore";

    export let videoBox: VideoBox;
    export let isOnOneLine: boolean;
    export let oneLineMode: "vertical" | "horizontal";
    export let videoWidth: number;
    export let videoHeight: number | undefined;

    const streamable = videoBox.streamable;
    const orderStore = videoBox.displayOrder;

    $: isFirst = $orderStore == 0;

    $: isLast = $orderStore == $oneLineStreamableCollectionStore.length - 1;
</script>

{#if (($highlightedEmbedScreen !== videoBox || $playerMovedInTheLast10Seconds) && (!isOnOneLine || oneLineMode === "horizontal")) || (isOnOneLine && oneLineMode === "vertical" && ($streamable?.displayInPictureInPictureMode ?? false))}
    <div
        style={`order: ${$orderStore}; width: ${videoWidth}px; max-width: ${videoWidth}px;${
            videoHeight ? `height: ${videoHeight}px; max-height: ${videoHeight}px;` : ""
        }`}
        class={` overflow-hidden
        ${
            isOnOneLine
                ? oneLineMode === "horizontal"
                    ? `pointer-events-auto basis-40 shrink-0 min-w-40 grow camera-box ${isFirst ? "ml-auto" : ""} ${
                          isLast ? "mr-auto" : ""
                      }`
                    : "pointer-events-auto basis-40 shrink-0 min-h-24 grow camera-box"
                : "pointer-events-auto shrink-0 camera-box"
        }`}
        class:aspect-video={videoHeight === undefined}
    >
        <MediaBox {videoBox} />
    </div>
{/if}
