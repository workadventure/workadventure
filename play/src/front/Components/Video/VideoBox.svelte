<script lang="ts">
    import MediaBox from "../Video/MediaBox.svelte";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import { VideoBox } from "../../Space/Space";
    import { streamableCollectionStore } from "../../Stores/StreamableCollectionStore";

    export let videoBox: VideoBox;
    export let isOnOneLine: boolean;
    export let oneLineMode: "vertical" | "horizontal";
    export let videoWidth: number;
    export let videoHeight: number | undefined;

    const streamable = videoBox.streamable;
    const orderStore = videoBox.displayOrder;
    let highlightedEmbedScreenDisplayOrder = $highlightedEmbedScreen?.displayOrder;

    $: isFirst = $orderStore == 0;
    $: isLast = $orderStore == $streamableCollectionStore.size - 1;
        
    $: if($highlightedEmbedScreen != undefined){
        highlightedEmbedScreenDisplayOrder = $highlightedEmbedScreen.displayOrder;

        if($highlightedEmbedScreenDisplayOrder != $orderStore){
            // The first
            isFirst = 
            // if the streamable is under 3 with one highlighted
            $streamableCollectionStore.size < 3 || 
            // if this is the first
            $orderStore == 0 || 
            // if the first is highlighted and this is the second and reverse is true
            ($highlightedEmbedScreenDisplayOrder == 1 && $orderStore == 0) || 
            ($orderStore == 1 && $highlightedEmbedScreenDisplayOrder == 0);

            // The last
            isLast = 
            // if the streamable is under 3 with one highlighted
            $streamableCollectionStore.size < 3 || 
            // if the order of video is the last of stream collection
            $orderStore == $streamableCollectionStore.size - 1 || 
            // if the last is highlighted and this is the previous last and reverse is true
            ($highlightedEmbedScreenDisplayOrder == $streamableCollectionStore.size - 1 && $orderStore == $streamableCollectionStore.size - 2 ) ||
            ($highlightedEmbedScreenDisplayOrder == $streamableCollectionStore.size - 2 && $orderStore == $streamableCollectionStore.size - 1 );
        }
    }
</script>

{#if ($highlightedEmbedScreen !== videoBox && (!isOnOneLine || oneLineMode === "horizontal")) || (isOnOneLine && oneLineMode === "vertical" && ($streamable?.displayInPictureInPictureMode ?? false))}
    <div
        style={`order: ${$orderStore}; width: ${videoWidth}px; max-width: ${videoWidth}px;${
            videoHeight ? `height: ${videoHeight}px; max-height: ${videoHeight}px;` : ""
        }`}
        class={isOnOneLine
            ? oneLineMode === "horizontal"
                ? `pointer-events-auto basis-40 shrink-0 min-w-40 grow camera-box ${isFirst ? "ml-auto" : ""} ${
                      isLast ? "mr-auto" : ""
                  }`
                : "pointer-events-auto basis-40 shrink-0 min-h-24 grow camera-box"
            : "pointer-events-auto shrink-0 camera-box"}
        class:aspect-video={videoHeight === undefined}
    >
        <MediaBox {videoBox} />
    </div>
{/if}
