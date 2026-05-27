<script lang="ts">
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { VideoBox } from "../../Space/VideoBox";
    import { playerMovedInTheLast10Seconds } from "../../Stores/VideoLayoutStore";
    import VideoBoxOptimizer from "./VideoBoxOptimizer.svelte";

    interface Props {
        videoBox: VideoBox;
        isOnOneLine: boolean;
        oneLineMode: "vertical" | "horizontal";
        videoWidth: number;
        videoHeight?: number;
        intersectionObserver?: IntersectionObserver;
        forceDisplay: boolean;
        fitContainer: boolean;
    }

    let {
        videoBox,
        isOnOneLine,
        oneLineMode,
        videoWidth,
        videoHeight,
        intersectionObserver,
        forceDisplay = false,
        fitContainer = false,
    }: Props = $props();

    let streamable = $derived(videoBox.streamable);
</script>

{#if forceDisplay || (($highlightedEmbedScreen !== videoBox || $playerMovedInTheLast10Seconds) && (!isOnOneLine || oneLineMode === "horizontal")) || (isOnOneLine && oneLineMode === "vertical" && ($streamable?.displayInPictureInPictureMode ?? false))}
    <VideoBoxOptimizer
        {videoBox}
        {isOnOneLine}
        {oneLineMode}
        {videoWidth}
        {videoHeight}
        {intersectionObserver}
        forceVisible={forceDisplay}
        {fitContainer}
    />
{/if}
